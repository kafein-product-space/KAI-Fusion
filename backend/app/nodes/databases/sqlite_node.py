"""SQLite workflow action node with a SQLite-only implementation."""

from __future__ import annotations

import contextlib
import datetime as dt
import json
import re
import sqlite3
from dataclasses import dataclass, field
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, Iterator, List, Mapping, Sequence

from ..base import (
    NodeInput,
    NodeOutput,
    NodePosition,
    NodeProperty,
    NodePropertyType,
    NodeType,
    ProcessorNode,
)


_SUPPORTED_OPERATIONS = {"delete_table", "execute_query", "insert", "upsert", "select", "update"}
_SUPPORTED_CONDITIONS = {"=", "!=", "LIKE", ">", "<", ">=", "<=", "IS NULL", "IS NOT NULL"}
_POSITIONAL_PARAMETER = re.compile(r"\$(\d+)(:name)?")
_MAX_SAFE_INTEGER = 9_007_199_254_740_991


@dataclass
class QuerySpec:
    sql: str
    parameters: Sequence[Any] | Mapping[str, Any] = field(default_factory=list)
    item_index: int = 0


@dataclass
class QueryResult:
    sql: str
    rows: List[Dict[str, Any]]
    affected_rows: int
    last_insert_id: int | None
    item_index: int


def _parse_json(value: Any, *, default: Any, field_name: str) -> Any:
    if value is None or value == "":
        return default
    if isinstance(value, (dict, list, int, float, bool)):
        return value
    try:
        return json.loads(str(value))
    except json.JSONDecodeError as exc:
        raise ValueError(f"{field_name} must contain valid JSON: {exc.msg}") from exc


def _as_bool(value: Any) -> bool:
    return value is True or str(value).strip().lower() in {"1", "true", "yes", "on"}


def _unwrap_connected_value(value: Any) -> Any:
    if isinstance(value, dict) and {"nodeId", "success", "output"}.issubset(value):
        return value["output"]
    return value


def _connected_payload(value: Any) -> Any:
    if isinstance(value, dict) and isinstance(value.get("rows"), list):
        return value["rows"]
    return value


def _flatten_node_configuration(user_data: Any) -> Dict[str, Any]:
    if not isinstance(user_data, dict):
        return {}
    configuration = dict(user_data)
    nested_inputs = user_data.get("inputs")
    if isinstance(nested_inputs, dict):
        configuration.update(nested_inputs)
    return configuration


def _records(inputs: Mapping[str, Any], connected: Any) -> List[Dict[str, Any]]:
    if str(inputs.get("data_mode") or "auto_map") == "manual":
        value = _parse_json(inputs.get("values"), default={}, field_name="Values to Send")
    else:
        value = connected
    if isinstance(value, dict) and isinstance(value.get("rows"), list):
        value = value["rows"]
    records = value if isinstance(value, list) else [value]
    if not records or not all(isinstance(record, dict) and record for record in records):
        raise ValueError("Rows must be a JSON object or a non-empty array of objects.")
    return [dict(record) for record in records]


def _common_columns(records: Sequence[Mapping[str, Any]]) -> List[str]:
    if not records:
        raise ValueError("At least one input row is required.")
    columns = list(records[0])
    expected = set(columns)
    for record in records[1:]:
        if set(record) != expected:
            raise ValueError("All rows in an insert batch must contain the same columns.")
    return columns


def _where_clause(identifier, inputs: Mapping[str, Any]) -> tuple[str, List[Any]]:
    raw = _parse_json(inputs.get("where"), default=[], field_name="Select Rows")
    if isinstance(raw, dict):
        raw = [
            {
                "column": column,
                "condition": "IS NULL" if value is None else "=",
                "value": value,
            }
            for column, value in raw.items()
        ]
    if not isinstance(raw, list):
        raise ValueError("Select Rows must be a JSON array or object.")
    combine = str(inputs.get("combine_conditions") or "AND").upper()
    if combine not in {"AND", "OR"}:
        raise ValueError("Combine Conditions must be AND or OR.")
    clauses: List[str] = []
    values: List[Any] = []
    for index, condition in enumerate(raw):
        if not isinstance(condition, dict) or not condition.get("column"):
            raise ValueError(f"Select Rows entry {index + 1} must contain a column.")
        operator = str(condition.get("condition") or condition.get("operator") or "=").upper()
        if operator == "EQUAL":
            operator = "="
        if operator not in _SUPPORTED_CONDITIONS:
            raise ValueError(f"Unsupported Select Rows operator: {operator}")
        value = condition.get("value")
        if operator in {">", "<", ">=", "<="}:
            try:
                value = float(value)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"Select Rows entry {index + 1} requires a numeric value.") from exc
        clause = f"{identifier(condition['column'])} {operator}"
        if operator not in {"IS NULL", "IS NOT NULL"}:
            clause += " ?"
            values.append(value)
        clauses.append(clause)
    return (f" WHERE {f' {combine} '.join(clauses)}" if clauses else ""), values


def _sort_clause(identifier, value: Any) -> str:
    rules = _parse_json(value, default=[], field_name="Sort")
    if not isinstance(rules, list):
        raise ValueError("Sort must be a JSON array.")
    parts: List[str] = []
    for index, rule in enumerate(rules):
        if not isinstance(rule, dict) or not rule.get("column"):
            raise ValueError(f"Sort entry {index + 1} must contain a column.")
        direction = str(rule.get("direction") or "ASC").upper()
        if direction not in {"ASC", "DESC"}:
            raise ValueError("Sort direction must be ASC or DESC.")
        parts.append(f"{identifier(rule['column'])} {direction}")
    return f" ORDER BY {', '.join(parts)}" if parts else ""


def _columns(qualified_identifier, value: str) -> str:
    if value.strip() == "*":
        return "*"
    columns = [column.strip() for column in value.split(",") if column.strip()]
    if not columns:
        raise ValueError("At least one output column is required.")
    return ", ".join(qualified_identifier(column) for column in columns)


def _prepare_query(
    qualified_identifier,
    query: str,
    parameters: Any,
) -> tuple[str, Sequence[Any] | Mapping[str, Any]]:
    if isinstance(parameters, dict):
        if _POSITIONAL_PARAMETER.search(query):
            raise ValueError(
                "$1 parameters require a JSON array; use SQLite :name placeholders for an object."
            )
        return query, parameters
    if not isinstance(parameters, (list, tuple)):
        raise ValueError("Query Parameters must be a JSON array or object.")

    values: List[Any] = []
    pieces: List[str] = []
    last = 0
    quote: str | None = None
    index = 0
    while index < len(query):
        char = query[index]
        if char in {"'", '"', "`"}:
            quote = None if quote == char else (char if quote is None else quote)
            index += 1
            continue
        if char == "$" and quote is None:
            match = _POSITIONAL_PARAMETER.match(query, index)
            if match:
                parameter_index = int(match.group(1)) - 1
                if parameter_index < 0 or parameter_index >= len(parameters):
                    raise ValueError(
                        f"Query references ${match.group(1)} but no replacement was supplied."
                    )
                pieces.append(query[last:index])
                if match.group(2):
                    pieces.append(qualified_identifier(parameters[parameter_index]))
                else:
                    pieces.append("?")
                    values.append(parameters[parameter_index])
                index = match.end()
                last = index
                continue
        index += 1
    pieces.append(query[last:])
    return "".join(pieces), values if values else list(parameters)


def _serializable_row(row: Mapping[str, Any], inputs: Mapping[str, Any]) -> Dict[str, Any]:
    def convert(value: Any) -> Any:
        if isinstance(value, Decimal):
            return float(value) if _as_bool(inputs.get("decimal_numbers")) else str(value)
        if (
            isinstance(value, int)
            and abs(value) > _MAX_SAFE_INTEGER
            and str(inputs.get("large_numbers_output") or "text") == "text"
        ):
            return str(value)
        if isinstance(value, (dt.datetime, dt.date, dt.time)):
            return value.isoformat()
        if isinstance(value, (bytes, bytearray)):
            return bytes(value).hex()
        return value

    return {str(key): convert(value) for key, value in row.items()}


def _error_item(error: Exception, item_index: int) -> Dict[str, Any]:
    return {
        "success": False,
        "message": str(error),
        "error_type": type(error).__name__,
        "item_index": item_index,
    }


# Tool-only safety helpers. These intentionally parse SQLite syntax rather than MySQL syntax.
_READ_COMMANDS = {"SELECT", "EXPLAIN"}
_SQLITE_TABLE_REFERENCE = re.compile(
    r'\b(?:FROM|JOIN|INTO|UPDATE)\s+((?:"[^"]+"|`[^`]+`|[A-Za-z0-9_$]+)(?:\.(?:"[^"]+"|`[^`]+`|[A-Za-z0-9_$]+))?)',
    re.IGNORECASE,
)


def _allowed_commands(configuration: Mapping[str, Any]):
    commands = set()
    allow_insert = _as_bool(configuration.get("allow_insert", False))
    allow_delete = _as_bool(configuration.get("allow_delete", False))
    if _as_bool(configuration.get("allow_read", True)):
        commands |= _READ_COMMANDS
    if allow_insert:
        commands.add("INSERT")
    if _as_bool(configuration.get("allow_update", False)):
        commands.add("UPDATE")
    if allow_delete:
        commands.add("DELETE")
    if allow_insert and allow_delete:
        commands.add("REPLACE")
    return commands


def _mask_sqlite_strings(statement: str) -> str:
    output: List[str] = []
    quote = False
    index = 0
    while index < len(statement):
        char = statement[index]
        if quote:
            output.append(" ")
            if char == "'":
                if index + 1 < len(statement) and statement[index + 1] == "'":
                    output.append(" ")
                    index += 1
                else:
                    quote = False
        elif char == "'":
            quote = True
            output.append(" ")
        else:
            output.append(char)
        index += 1
    return "".join(output)


def _strip_code_fence(query: str) -> str:
    value = str(query or "").strip()
    match = re.fullmatch(r"```(?:sql)?\s*(.*?)\s*```", value, flags=re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match else value


def _validate_single_statement(statement: str) -> str:
    quote: str | None = None
    semicolons: List[int] = []
    index = 0
    while index < len(statement):
        char = statement[index]
        next_char = statement[index + 1] if index + 1 < len(statement) else ""
        if quote:
            if char == quote:
                if next_char == quote:
                    index += 1
                else:
                    quote = None
        elif char in {"'", '"', "`"}:
            quote = char
        elif (char == "-" and next_char == "-") or (char == "/" and next_char == "*"):
            raise ValueError("SQL comments are disabled for SQLite Tool queries.")
        elif char == ";":
            semicolons.append(index)
        index += 1
    if quote:
        raise ValueError("The SQL query contains an unterminated quoted value.")
    if semicolons:
        final_non_space = len(statement.rstrip()) - 1
        if len(semicolons) > 1 or semicolons[0] != final_non_space:
            raise ValueError("SQLite Tool accepts exactly one SQL statement per call.")
        statement = statement[:semicolons[0]].rstrip()
    if not statement:
        raise ValueError("Provide a SQL query.")
    return statement


def _statement_command(statement: str) -> str:
    masked = _mask_sqlite_strings(statement)
    first = re.match(r"\s*([A-Za-z]+)", masked)
    if not first:
        raise ValueError("Unable to determine the SQL command.")
    command = first.group(1).upper()
    if command != "WITH":
        return command
    depth = 0
    for match in re.finditer(r"[A-Za-z_]+|[()]", masked[first.end():]):
        token = match.group(0).upper()
        if token == "(":
            depth += 1
        elif token == ")":
            depth = max(0, depth - 1)
        elif depth == 0 and token in {"SELECT", "INSERT", "UPDATE", "DELETE", "REPLACE"}:
            return token
    raise ValueError("Unable to determine the command following WITH.")


def _requires_where_clause(statement: str) -> bool:
    return bool(re.search(r"\bWHERE\b", _mask_sqlite_strings(statement), re.IGNORECASE))


def _normalized_allowed_tables(value: Any):
    parts = value if isinstance(value, list) else str(value or "").split(",")
    return {
        str(part).strip().strip("`").strip('"').lower()
        for part in parts
        if str(part).strip()
    }


def _referenced_tables(statement: str):
    masked = _mask_sqlite_strings(statement)
    cte_aliases = {
        match.group(1).replace("`", "").replace('"', "").lower()
        for match in re.finditer(
            r'(?:\bWITH\b|,)\s*("[^"]+"|`[^`]+`|[A-Za-z0-9_$]+)(?:\s*\([^)]*\))?\s+AS\s*\(',
            masked,
            re.IGNORECASE,
        )
    }
    tables = set()
    for match in _SQLITE_TABLE_REFERENCE.finditer(masked):
        raw = match.group(1).replace("`", "").replace('"', "").lower()
        if raw not in cte_aliases:
            tables.add(raw)
            tables.add(raw.rsplit(".", 1)[-1])
    return tables


_TEXT_PREDICATE = re.compile(
    r'((?:"[^"]+"|`[^`]+`|[A-Za-z_][A-Za-z0-9_$]*)(?:\.(?:"[^"]+"|`[^`]+`|[A-Za-z_][A-Za-z0-9_$]*))?)\s*(<>|!=|=|(?:NOT\s+)?LIKE)\s*(\'(?:\'\'|[^\'])*\')',
    re.IGNORECASE,
)
_DATE_LIKE = re.compile(r"^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$")


def _case_insensitive_predicates(statement: str) -> str:
    masked = _mask_sqlite_strings(statement)
    where = re.search(r"\bWHERE\b", masked, re.IGNORECASE)
    if not where:
        return statement
    prefix = statement[:where.end()]
    predicate = statement[where.end():]

    def replace(match: re.Match[str]) -> str:
        literal = match.group(3)
        body = literal[1:-1]
        if _DATE_LIKE.match(body.strip()) or not any(char.isalpha() for char in body):
            return match.group(0)
        return f"LOWER({match.group(1)}) {match.group(2)} LOWER({literal})"

    return prefix + _TEXT_PREDICATE.sub(replace, predicate)


def _sqlite_credential_secret(node: Any, credential_id: Any) -> Dict[str, Any]:
    if not credential_id:
        raise ValueError("A SQLite credential must be selected.")
    credential = node.get_credential(str(credential_id))
    if not credential:
        raise ValueError("The selected SQLite credential could not be found.")
    if credential.get("service_type") != "sqlite":
        raise ValueError("The selected credential is not a SQLite credential.")
    secret = credential.get("secret") or {}
    if not isinstance(secret, dict):
        raise ValueError("The selected SQLite credential has an invalid secret payload.")
    return secret


def _database_path(secret: Mapping[str, Any]) -> str:
    raw_path = str(secret.get("database_path") or secret.get("database") or "").strip()
    if not raw_path:
        raise ValueError("The SQLite credential must define a database path.")
    if raw_path == ":memory:":
        return raw_path
    return str(Path(raw_path).expanduser().resolve())


@contextlib.contextmanager
def sqlite_connection(
    secret: Mapping[str, Any],
    options: Mapping[str, Any] | None = None,
) -> Iterator[sqlite3.Connection]:
    """Open a SQLite connection with foreign keys and dictionary-like rows."""
    options = options or {}
    database = _database_path(secret)
    read_only = _as_bool(secret.get("read_only"))
    if read_only and database == ":memory:":
        raise ValueError("An in-memory SQLite database cannot be opened read-only.")
    if database != ":memory:" and not Path(database).is_file():
        if read_only or not _as_bool(secret.get("create_if_missing")):
            raise ValueError("The SQLite database file does not exist.")
        Path(database).parent.mkdir(parents=True, exist_ok=True)

    timeout_ms = options.get("connection_timeout_ms") or secret.get("timeout_ms") or 30_000
    target = f"file:{Path(database).as_posix()}?mode=ro" if read_only else database
    connection = sqlite3.connect(
        target,
        timeout=max(0.001, int(timeout_ms) / 1000),
        uri=read_only,
        check_same_thread=False,
    )
    connection.row_factory = sqlite3.Row
    try:
        connection.execute("PRAGMA foreign_keys = ON")
        yield connection
    finally:
        connection.close()


class SQLiteNode(ProcessorNode):
    """Read and mutate SQLite data without importing the MySQL integration."""

    def __init__(self):
        super().__init__()
        table_operations = ["delete_table", "insert", "upsert", "select", "update"]
        mapped_operations = ["insert", "upsert", "update"]
        filter_operations = ["delete_table", "select"]
        operation_options = [
            {"label": "Delete table or rows", "value": "delete_table"},
            {"label": "Execute a SQL query", "value": "execute_query"},
            {"label": "Insert rows in a table", "value": "insert"},
            {"label": "Insert or update rows in a table", "value": "upsert"},
            {"label": "Select rows from a table", "value": "select"},
            {"label": "Update rows in a table", "value": "update"},
        ]
        self._metadata = {
            "name": "SQLite",
            "display_name": "SQLite",
            "description": "Get, add, update, and delete data in a SQLite database file.",
            "category": "Database",
            "node_type": NodeType.PROCESSOR,
            "icon": {"name": "sqlite", "path": "icons/sqlite.svg", "alt": "SQLite"},
            "colors": ["sky-700", "cyan-900"],
            "version": "1.0.0",
            "documentation_url": "https://www.sqlite.org/docs.html",
            "inputs": [NodeInput(name="input", displayName="Input", type="any", description="Incoming row or rows used by automatic mapping and query batching.", required=False, is_connection=True, direction=NodePosition.LEFT)],
            "outputs": [NodeOutput(name="output", displayName="Output", type="any", description="Selected rows together with SQLite execution metadata.", is_connection=True, direction=NodePosition.RIGHT)],
            "properties": [
                NodeProperty(name="credential_id", displayName="Credential", type=NodePropertyType.CREDENTIAL_SELECT, description="SQLite database credential.", serviceType="sqlite", required=True),
                NodeProperty(name="operation", displayName="Operation", type=NodePropertyType.SELECT, description="Choose the SQLite action this workflow node executes.", default="insert", options=operation_options, required=True),
                NodeProperty(name="table", displayName="Table", type=NodePropertyType.TEXT, description="Table name in the selected SQLite database.", placeholder="customers", displayOptions={"show": {"operation": table_operations}}, required=True),
                NodeProperty(name="delete_command", displayName="Command", type=NodePropertyType.SELECT, description="Truncate keeps the structure, Delete filters rows, and Drop removes the table.", default="truncate", options=[{"label": "Truncate", "value": "truncate"}, {"label": "Delete", "value": "delete"}, {"label": "Drop", "value": "drop"}], displayOptions={"show": {"operation": "delete_table"}}, required=True),
                NodeProperty(name="query", displayName="SQL Query", type=NodePropertyType.TEXT_AREA, description="SQL to run. Use $1, $2, ... for values and $1:name for identifiers.", placeholder="SELECT id, name FROM customers WHERE status = $1", rows=8, displayOptions={"show": {"operation": "execute_query"}}, required=True),
                NodeProperty(name="query_parameters", displayName="Query Parameters", type=NodePropertyType.JSON_EDITOR, description="JSON array or object of parameter values.", default="[]", displayOptions={"show": {"operation": "execute_query"}}, required=False),
                NodeProperty(name="data_mode", displayName="Mapping Column Mode", type=NodePropertyType.SELECT, description="Automatically map incoming properties or define values manually.", default="auto_map", options=[{"label": "Map Automatically", "value": "auto_map"}, {"label": "Map Each Column Manually", "value": "manual"}], displayOptions={"show": {"operation": mapped_operations}}, required=True),
                NodeProperty(name="values", displayName="Values to Send", type=NodePropertyType.JSON_EDITOR, description="A JSON object or array of objects containing column/value pairs.", default="{}", displayOptions={"show": {"operation": mapped_operations, "data_mode": "manual"}}, required=True),
                NodeProperty(name="match_column", displayName="Column to Match On", type=NodePropertyType.TEXT, description="Unique column used to match the row.", placeholder="email", displayOptions={"show": {"operation": ["upsert", "update"]}}, required=True),
                NodeProperty(name="match_value", displayName="Value of Column to Match On", type=NodePropertyType.TEXT, description="Match value used in manual mapping mode.", displayOptions={"show": {"operation": ["upsert", "update"], "data_mode": "manual"}}, required=True),
                NodeProperty(name="where", displayName="Select Rows", type=NodePropertyType.JSON_EDITOR, description="JSON conditions used to filter rows.", default="[]", displayOptions={"show": {"operation": filter_operations}}, required=False),
                NodeProperty(name="combine_conditions", displayName="Combine Conditions", type=NodePropertyType.SELECT, description="Combine conditions with AND or OR.", default="AND", options=[{"label": "AND", "value": "AND"}, {"label": "OR", "value": "OR"}], displayOptions={"show": {"operation": filter_operations}}, required=True),
                NodeProperty(name="return_all", displayName="Return All", type=NodePropertyType.CHECKBOX, description="Return every matching row instead of applying a limit.", default=False, displayOptions={"show": {"operation": "select"}}, required=True),
                NodeProperty(name="limit", displayName="Limit", type=NodePropertyType.NUMBER, description="Maximum rows returned when Return All is disabled.", default=50, min=1, max=1_000_000, displayOptions={"show": {"operation": "select", "return_all": False}}, required=True),
                NodeProperty(name="output_columns", displayName="Output Columns", type=NodePropertyType.TEXT, description="Comma-separated columns to return, or * for every column.", default="*", displayOptions={"show": {"operation": "select"}}, required=True),
                NodeProperty(name="sort", displayName="Sort", type=NodePropertyType.JSON_EDITOR, description="JSON sort rules.", default="[]", displayOptions={"show": {"operation": "select"}}, required=False),
                NodeProperty(name="query_batching", displayName="Query Batching", type=NodePropertyType.SELECT, description="Run input items as one batch, independently, or in a transaction.", default="single", options=[{"label": "Single Query", "value": "single"}, {"label": "Independent", "value": "independent"}, {"label": "Transaction", "value": "transaction"}], tabName="advanced", required=False),
                NodeProperty(name="connection_timeout_ms", displayName="Connection Timeout (ms)", type=NodePropertyType.NUMBER, description="Time reserved for opening the SQLite connection.", default=30_000, min=1, tabName="advanced", required=False),
                NodeProperty(name="replace_empty_strings", displayName="Replace Empty Strings with NULL", type=NodePropertyType.CHECKBOX, description="Convert empty incoming strings to SQL NULL values.", default=False, tabName="advanced", displayOptions={"show": {"operation": ["insert", "update", "upsert", "execute_query"]}}, required=False),
                NodeProperty(name="select_distinct", displayName="Select Distinct", type=NodePropertyType.CHECKBOX, description="Remove duplicate rows from Select output.", default=False, tabName="advanced", displayOptions={"show": {"operation": "select"}}, required=False),
                NodeProperty(name="large_numbers_output", displayName="Output Large-Format Numbers As", type=NodePropertyType.SELECT, description="Return large integers as text or numbers.", default="text", options=[{"label": "Text", "value": "text"}, {"label": "Numbers", "value": "numbers"}], tabName="advanced", displayOptions={"show": {"operation": ["select", "execute_query"]}}, required=False),
                NodeProperty(name="skip_on_conflict", displayName="Skip on Conflict", type=NodePropertyType.CHECKBOX, description="Use INSERT OR IGNORE for constraint conflicts.", default=False, tabName="advanced", displayOptions={"show": {"operation": "insert"}}, required=False),
                NodeProperty(name="detailed_output", displayName="Output Query Execution Details", type=NodePropertyType.CHECKBOX, description="Include SQL and per-query metadata in the output.", default=False, tabName="advanced", required=False),
                NodeProperty(name="continue_on_fail", displayName="Continue on Fail", type=NodePropertyType.CHECKBOX, description="Return an error item and continue independent queries.", default=False, tabName="advanced", required=False),
            ],
        }

    def get_required_packages(self) -> List[str]:
        return []

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Any] | None = None) -> Dict[str, Any]:
        configuration = {**_flatten_node_configuration(self.user_data), **inputs}
        operation = str(configuration.get("operation") or "insert")
        if operation not in _SUPPORTED_OPERATIONS:
            raise ValueError(f"Unsupported SQLite operation: {operation}")

        secret = _sqlite_credential_secret(self, configuration.get("credential_id"))
        connected = _connected_payload(_unwrap_connected_value((connected_nodes or {}).get("input")))
        specs = self._build_queries(operation, configuration, connected)
        mode = str(configuration.get("query_batching") or "single")
        if mode not in {"single", "independent", "transaction"}:
            raise ValueError("Query batching must be single, independent, or transaction.")

        results: List[QueryResult] = []
        errors: List[Dict[str, Any]] = []
        with sqlite_connection(secret, configuration) as connection:
            if mode == "independent":
                for spec in specs:
                    try:
                        results.extend(self._execute_spec(connection, spec, configuration))
                        connection.commit()
                    except Exception as exc:
                        connection.rollback()
                        if not _as_bool(configuration.get("continue_on_fail")):
                            raise
                        errors.append(self._error_item(exc, spec.item_index))
            else:
                try:
                    for spec in specs:
                        results.extend(self._execute_spec(connection, spec, configuration))
                    connection.commit()
                except Exception:
                    connection.rollback()
                    raise

        rows = [row for result in results for row in result.rows]
        affected_rows = sum(max(0, result.affected_rows) for result in results)
        last_insert_id = next((result.last_insert_id for result in reversed(results) if result.last_insert_id), None)
        output: Dict[str, Any] = {
            "success": not errors,
            "operation": operation,
            "rows": rows,
            "row_count": len(rows),
            "affected_rows": affected_rows,
            "last_insert_id": last_insert_id,
            "errors": errors,
        }
        if _as_bool(configuration.get("detailed_output")):
            output["details"] = [
                {
                    "sql": result.sql,
                    "item_index": result.item_index,
                    "data": result.rows if result.rows else {
                        "success": True,
                        "affected_rows": result.affected_rows,
                        "last_insert_id": result.last_insert_id,
                    },
                }
                for result in results
            ] + errors
        return {"output": output}

    def _build_queries(self, operation: str, inputs: Mapping[str, Any], connected: Any) -> List[QuerySpec]:
        if operation == "execute_query":
            return self._execute_query_specs(inputs, connected)

        table = self._qualified_identifier(inputs.get("table"))
        if operation == "delete_table":
            command = str(inputs.get("delete_command") or "truncate").lower()
            if command == "drop":
                return [QuerySpec(f"DROP TABLE IF EXISTS {table}")]
            if command == "truncate":
                return [QuerySpec(f"DELETE FROM {table}")]
            if command != "delete":
                raise ValueError("Delete command must be drop, truncate, or delete.")
            where_sql, where_values = self._where_clause(inputs)
            return [QuerySpec(f"DELETE FROM {table}{where_sql}", where_values)]

        if operation == "select":
            columns = self._columns(str(inputs.get("output_columns") or "*"))
            distinct = " DISTINCT" if _as_bool(inputs.get("select_distinct")) else ""
            where_sql, values = self._where_clause(inputs)
            sort_sql = self._sort_clause(inputs.get("sort"))
            limit_sql = ""
            if not _as_bool(inputs.get("return_all")):
                limit_sql = " LIMIT ?"
                values = [*values, max(1, int(inputs.get("limit") or 50))]
            return [QuerySpec(f"SELECT{distinct} {columns} FROM {table}{where_sql}{sort_sql}{limit_sql}", values)]

        records = self._records(inputs, connected)
        if _as_bool(inputs.get("replace_empty_strings")):
            records = [{key: (None if value == "" else value) for key, value in row.items()} for row in records]
        if operation == "insert":
            return self._insert_specs(table, records, inputs)
        if operation == "upsert":
            return self._upsert_specs(table, records, inputs)
        return self._update_specs(table, records, inputs)

    def _execute_query_specs(self, inputs: Mapping[str, Any], connected: Any) -> List[QuerySpec]:
        query = str(inputs.get("query") or "").strip()
        if not query:
            raise ValueError("SQL Query is required.")
        raw_parameters = _parse_json(inputs.get("query_parameters"), default=[], field_name="Query Parameters")
        parameter_sets: List[Any]
        if raw_parameters in ([], {}) and connected is not None:
            parameter_sets = connected if isinstance(connected, list) else [connected]
        else:
            parameter_sets = [raw_parameters]
        specs: List[QuerySpec] = []
        for index, parameters in enumerate(parameter_sets):
            if _as_bool(inputs.get("replace_empty_strings")):
                if isinstance(parameters, list):
                    parameters = [None if value == "" else value for value in parameters]
                elif isinstance(parameters, dict):
                    parameters = {key: (None if value == "" else value) for key, value in parameters.items()}
            prepared, values = _prepare_query(self._qualified_identifier, query, parameters)
            specs.append(QuerySpec(prepared, values, index))
        return specs

    def _insert_specs(self, table: str, records: List[Dict[str, Any]], inputs: Mapping[str, Any]) -> List[QuerySpec]:
        columns = self._common_columns(records)
        command = "INSERT OR IGNORE" if _as_bool(inputs.get("skip_on_conflict")) else "INSERT"
        column_sql = ", ".join(self._identifier(column) for column in columns)
        placeholders = ", ".join("?" for _ in columns)
        sql = f"{command} INTO {table} ({column_sql}) VALUES ({placeholders})"
        return [QuerySpec(sql, [record[column] for column in columns], index) for index, record in enumerate(records)]

    def _upsert_specs(self, table: str, records: List[Dict[str, Any]], inputs: Mapping[str, Any]) -> List[QuerySpec]:
        match_column = str(inputs.get("match_column") or "").strip()
        if not match_column:
            raise ValueError("Column to Match On is required for Insert or Update.")
        manual = str(inputs.get("data_mode") or "auto_map") == "manual"
        specs: List[QuerySpec] = []
        for index, record in enumerate(records):
            row = dict(record)
            if manual:
                row[match_column] = inputs.get("match_value")
            if match_column not in row:
                raise ValueError(f"Incoming row {index} does not contain match column '{match_column}'.")
            columns = list(row)
            update_columns = [column for column in columns if column != match_column]
            if not update_columns:
                raise ValueError("Insert or Update needs at least one non-match column.")
            column_sql = ", ".join(self._identifier(column) for column in columns)
            placeholders = ", ".join("?" for _ in columns)
            updates = ", ".join(
                f"{self._identifier(column)} = excluded.{self._identifier(column)}" for column in update_columns
            )
            sql = (
                f"INSERT INTO {table} ({column_sql}) VALUES ({placeholders}) "
                f"ON CONFLICT ({self._identifier(match_column)}) DO UPDATE SET {updates}"
            )
            specs.append(QuerySpec(sql, [row[column] for column in columns], index))
        return specs

    def _update_specs(self, table: str, records: List[Dict[str, Any]], inputs: Mapping[str, Any]) -> List[QuerySpec]:
        match_column = str(inputs.get("match_column") or "").strip()
        if not match_column:
            raise ValueError("Column to Match On is required for Update.")
        manual = str(inputs.get("data_mode") or "auto_map") == "manual"
        specs: List[QuerySpec] = []
        for index, record in enumerate(records):
            row = dict(record)
            match_value = inputs.get("match_value") if manual else row.get(match_column)
            if not manual and match_column not in row:
                raise ValueError(f"Incoming row {index} does not contain match column '{match_column}'.")
            update_columns = [column for column in row if column != match_column]
            if not update_columns:
                raise ValueError("Update needs at least one non-match column.")
            assignments = ", ".join(f"{self._identifier(column)} = ?" for column in update_columns)
            values = [row[column] for column in update_columns] + [match_value]
            specs.append(QuerySpec(
                f"UPDATE {table} SET {assignments} WHERE {self._identifier(match_column)} = ?",
                values,
                index,
            ))
        return specs

    def _execute_spec(self, connection: sqlite3.Connection, spec: QuerySpec, inputs: Mapping[str, Any]) -> List[QueryResult]:
        cursor = connection.cursor()
        try:
            cursor.execute(spec.sql, spec.parameters or ())
            rows = list(cursor.fetchall()) if cursor.description else []
            return [QueryResult(
                sql=spec.sql,
                rows=[self._serializable_row(dict(row), inputs) for row in rows],
                affected_rows=max(0, int(cursor.rowcount or 0)),
                last_insert_id=int(cursor.lastrowid) if cursor.lastrowid else None,
                item_index=spec.item_index,
            )]
        finally:
            cursor.close()

    @classmethod
    def _prepare_query(cls, query: str, parameters: Any) -> tuple[str, Sequence[Any] | Mapping[str, Any]]:
        if isinstance(parameters, dict):
            if _POSITIONAL_PARAMETER.search(query):
                raise ValueError("$1 parameters require a JSON array; use SQLite :name placeholders for an object.")
            return query, parameters
        if not isinstance(parameters, (list, tuple)):
            raise ValueError("Query Parameters must be a JSON array or object.")

        values: List[Any] = []
        pieces: List[str] = []
        last = 0
        quote: str | None = None
        index = 0
        while index < len(query):
            char = query[index]
            if char in {"'", '"', "`"}:
                quote = None if quote == char else (char if quote is None else quote)
                index += 1
                continue
            if char == "$" and quote is None:
                match = _POSITIONAL_PARAMETER.match(query, index)
                if match:
                    parameter_index = int(match.group(1)) - 1
                    if parameter_index < 0 or parameter_index >= len(parameters):
                        raise ValueError(f"Query references ${match.group(1)} but no replacement was supplied.")
                    pieces.append(query[last:index])
                    if match.group(2):
                        pieces.append(cls._qualified_identifier(parameters[parameter_index]))
                    else:
                        pieces.append("?")
                        values.append(parameters[parameter_index])
                    index = match.end()
                    last = index
                    continue
            index += 1
        pieces.append(query[last:])
        return "".join(pieces), values if pieces[:-1] else list(parameters)

    @classmethod
    def _where_clause(cls, inputs: Mapping[str, Any]) -> tuple[str, List[Any]]:
        return _where_clause(cls._identifier, inputs)

    @staticmethod
    def _records(inputs: Mapping[str, Any], connected: Any) -> List[Dict[str, Any]]:
        return _records(inputs, connected)

    @staticmethod
    def _common_columns(records: Sequence[Mapping[str, Any]]) -> List[str]:
        return _common_columns(records)

    @classmethod
    def _columns(cls, value: str) -> str:
        return _columns(cls._qualified_identifier, value)

    @classmethod
    def _sort_clause(cls, value: Any) -> str:
        return _sort_clause(cls._identifier, value)

    @staticmethod
    def _error_item(error: Exception, item_index: int) -> Dict[str, Any]:
        return _error_item(error, item_index)

    @staticmethod
    def _serializable_row(row: Mapping[str, Any], inputs: Mapping[str, Any]) -> Dict[str, Any]:
        return _serializable_row(row, inputs)

    @staticmethod
    def _identifier(value: Any) -> str:
        identifier = str(value).strip()
        if not identifier or "\x00" in identifier:
            raise ValueError("SQLite identifiers cannot be empty or contain a null byte.")
        return f'"{identifier.replace(chr(34), chr(34) * 2)}"'

    @classmethod
    def _qualified_identifier(cls, value: Any) -> str:
        parts = [part.strip() for part in str(value).split(".")]
        if not parts or any(not part for part in parts) or len(parts) > 2:
            raise ValueError("A SQLite identifier may contain a table, or schema and table.")
        return ".".join(cls._identifier(part) for part in parts)
