"""Security-scoped SQLite tool provider for AI agents."""

from __future__ import annotations

import contextlib
import json
import re
import sqlite3
from pathlib import Path
from typing import Any, Dict, Iterator, List, Mapping

from langchain_core.tools import Tool

from ..base import NodeInput, NodeOutput, NodePosition, NodeProperty, NodePropertyType, NodeType, ProviderNode


_READ_COMMANDS = {"SELECT", "EXPLAIN"}
_SQLITE_TABLE_REFERENCE = re.compile(
    r'\b(?:FROM|JOIN|INTO|UPDATE)\s+((?:"[^"]+"|`[^`]+`|[A-Za-z0-9_$]+)(?:\.(?:"[^"]+"|`[^`]+`|[A-Za-z0-9_$]+))?)',
    re.IGNORECASE,
)
_TEXT_PREDICATE = re.compile(
    r'((?:"[^"]+"|`[^`]+`|[A-Za-z_][A-Za-z0-9_$]*)(?:\.(?:"[^"]+"|`[^`]+`|[A-Za-z_][A-Za-z0-9_$]*))?)\s*(<>|!=|=|(?:NOT\s+)?LIKE)\s*(\'(?:\'\'|[^\'])*\')',
    re.IGNORECASE,
)
_DATE_LIKE = re.compile(r"^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$")


def _as_bool(value: Any) -> bool:
    return value is True or str(value).strip().lower() in {"1", "true", "yes", "on"}


def _flatten_node_configuration(user_data: Any) -> Dict[str, Any]:
    if not isinstance(user_data, dict):
        return {}
    configuration = dict(user_data)
    nested_inputs = user_data.get("inputs")
    if isinstance(nested_inputs, dict):
        configuration.update(nested_inputs)
    return configuration


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


class SQLiteToolNode(ProviderNode):
    """Expose a SQLite database to an Agent through explicit permissions."""

    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "SQLiteTool",
            "display_name": "SQLite Tool",
            "description": "Give an Agent explicitly scoped access to a SQLite database.",
            "category": "Tool",
            "node_type": NodeType.PROVIDER,
            "icon": {"name": "sqlite", "path": "icons/sqlite.svg", "alt": "SQLite Tool"},
            "colors": ["sky-700", "cyan-900"],
            "version": "1.0.0",
            "inputs": [
                NodeInput(name="credential_id", type="str", description="Selected SQLite credential ID.", required=True),
                NodeInput(name="allowed_tables", type="str", description="Optional table allowlist.", default="", required=False),
                NodeInput(name="return_all_rows", type="bool", description="Ignore max_rows.", default=False, required=False),
                NodeInput(name="max_rows", type="int", description="Maximum returned rows.", default=200, required=False),
                NodeInput(name="allow_read", type="bool", description="Allow SELECT and EXPLAIN.", default=True, required=False),
                NodeInput(name="allow_insert", type="bool", description="Allow INSERT.", default=False, required=False),
                NodeInput(name="allow_update", type="bool", description="Allow UPDATE.", default=False, required=False),
                NodeInput(name="allow_delete", type="bool", description="Allow DELETE.", default=False, required=False),
                NodeInput(name="tool_name", type="str", description="Name exposed to the Agent.", default="sqlite_database", required=False),
                NodeInput(name="connection_timeout_ms", type="int", description="Connection timeout.", default=30000, required=False),
            ],
            "outputs": [
                NodeOutput(
                    name="tool",
                    displayName="Tool",
                    type="BaseTool",
                    description="Permission-scoped SQLite tool for an Agent's Tools input.",
                    is_connection=True,
                    direction=NodePosition.TOP,
                )
            ],
            "properties": [
                NodeProperty(
                    name="credential_id", displayName="Credential", type=NodePropertyType.CREDENTIAL_SELECT,
                    serviceType="sqlite", required=True, description="SQLite credential used only by this tool.",
                    tabName="basic",
                ),
                NodeProperty(
                    name="allowed_tables", displayName="Allowed Tables", type=NodePropertyType.TEXT,
                    placeholder="customers, orders", required=False,
                    description="Optional allowlist. Leave empty to allow all tables in the database file.",
                    tabName="basic",
                ),
                NodeProperty(
                    name="return_all_rows", displayName="Return All Rows", type=NodePropertyType.CHECKBOX,
                    default=False, required=False, description="Ignore the row limit up to a hard safety ceiling.",
                    tabName="basic",
                ),
                NodeProperty(
                    name="max_rows", displayName="Maximum Rows", type=NodePropertyType.NUMBER,
                    default=200, min=1, max=5000, required=False,
                    description="Maximum rows placed in the Agent context.",
                    tabName="basic",
                ),
                NodeProperty(
                    name="permissions_title", displayName="Permissions", type=NodePropertyType.TITLE,
                    description="What the agent is allowed to do with the database.",
                    required=True, tabName="basic",
                ),
                NodeProperty(
                    name="allow_read", displayName="Allow Read", type=NodePropertyType.CHECKBOX,
                    default=True, required=False, description="Allow SELECT and EXPLAIN statements.",
                    tabName="basic",
                ),
                NodeProperty(
                    name="allow_insert", displayName="Allow Insert", type=NodePropertyType.CHECKBOX,
                    default=False, required=False, description="Allow INSERT statements.",
                    tabName="basic",
                ),
                NodeProperty(
                    name="allow_update", displayName="Allow Update", type=NodePropertyType.CHECKBOX,
                    default=False, required=False, description="Allow UPDATE statements.",
                    tabName="basic",
                ),
                NodeProperty(
                    name="allow_delete", displayName="Allow Delete", type=NodePropertyType.CHECKBOX,
                    default=False, required=False, description="Allow DELETE statements and REPLACE when Insert is also allowed.",
                    tabName="basic",
                ),
                NodeProperty(
                    name="tool_name", displayName="Tool Name", type=NodePropertyType.TEXT,
                    default="sqlite_database", required=False, tabName="advanced",
                    description="Stable name exposed to the Agent.",
                ),
                NodeProperty(
                    name="connection_timeout_ms", displayName="Connection Timeout (ms)", type=NodePropertyType.NUMBER,
                    default=30000, min=1000, max=300000, required=False, tabName="advanced",
                ),
            ],
        }

    def get_required_packages(self) -> List[str]:
        return []

    def execute(self, **kwargs: Any) -> Dict[str, Any]:
        configuration = {**_flatten_node_configuration(self.user_data), **kwargs}
        secret = _sqlite_credential_secret(self, configuration.get("credential_id"))
        allowed_commands = _allowed_commands(configuration)
        allowed_tables = _normalized_allowed_tables(configuration.get("allowed_tables"))
        return_all_rows = _as_bool(configuration.get("return_all_rows", False))
        max_rows = 50_000 if return_all_rows else min(5000, max(1, int(configuration.get("max_rows") or 200)))
        raw_name = str(configuration.get("tool_name") or "sqlite_database").strip()
        tool_name = re.sub(r"[^a-zA-Z0-9_-]", "_", raw_name) or "sqlite_database"

        def run_query(query: str) -> str:
            try:
                statement = _validate_single_statement(_strip_code_fence(query))
                command = _statement_command(statement)
                if command not in allowed_commands:
                    return json.dumps({"error": f"{command} is not allowed by the current permission settings."})
                masked_statement = _mask_sqlite_strings(statement)
                if command == "INSERT" and re.search(r"\bINSERT\s+OR\s+REPLACE\b", masked_statement, re.IGNORECASE):
                    if "REPLACE" not in allowed_commands:
                        return json.dumps({"error": "INSERT OR REPLACE requires both Insert and Delete permissions."})
                if command == "INSERT" and re.search(
                    r"\bON\s+CONFLICT\b[\s\S]*?\bDO\s+UPDATE\b",
                    masked_statement,
                    re.IGNORECASE,
                ):
                    if "UPDATE" not in allowed_commands:
                        return json.dumps({"error": "ON CONFLICT DO UPDATE requires Update permission."})
                if command in {"UPDATE", "DELETE"} and not _requires_where_clause(statement):
                    return json.dumps({"error": f"{command} statements must include a WHERE clause that selects the rows to change."})

                if allowed_tables:
                    referenced = _referenced_tables(statement)
                    unauthorized = sorted(
                        table for table in referenced
                        if table not in allowed_tables and table.rsplit(".", 1)[-1] not in allowed_tables
                    )
                    if unauthorized:
                        return json.dumps({"error": f"Table access denied: {', '.join(unauthorized)}"})
                    if not referenced:
                        return json.dumps({"error": "Could not verify table access for this query."})

                statement = _case_insensitive_predicates(statement)
                rows: List[Dict[str, Any]] = []
                affected_rows = 0
                last_insert_id = None
                truncated = False
                with sqlite_connection(secret, configuration) as connection:
                    cursor = connection.cursor()
                    try:
                        cursor.execute(statement)
                        if cursor.description:
                            fetched = list(cursor.fetchmany(max_rows + 1))
                            truncated = len(fetched) > max_rows
                            rows = [self._serialize_row(dict(row)) for row in fetched[:max_rows]]
                        affected_rows = max(0, int(cursor.rowcount or 0))
                        last_insert_id = int(cursor.lastrowid) if cursor.lastrowid else None
                        connection.commit()
                    except Exception:
                        connection.rollback()
                        raise
                    finally:
                        cursor.close()

                return json.dumps(
                    {
                        "rows": rows,
                        "row_count": len(rows),
                        "truncated": truncated,
                        "max_rows": max_rows,
                        "affected_rows": affected_rows,
                        "last_insert_id": last_insert_id,
                    },
                    ensure_ascii=False,
                    default=str,
                )
            except Exception as exc:
                return json.dumps({"error": str(exc)}, ensure_ascii=False)

        permission_text = ", ".join(sorted(allowed_commands)) or "none"
        table_text = ", ".join(sorted(allowed_tables)) if allowed_tables else "all tables in the database file"
        tool = Tool(
            name=tool_name,
            func=run_query,
            description=(
                f"Run one SQL statement against SQLite database '{_database_path(secret)}'. "
                f"Allowed commands: {permission_text}. Allowed tables: {table_text}. "
                "Inspect sqlite_master before querying when the schema is unknown. "
                "UPDATE and DELETE always require a WHERE clause. Text predicates are case-insensitive. "
                f"Return at most {max_rows} rows and prefer selective WHERE clauses."
            ),
        )
        return {"sqlite_database": {"tool": tool}}

    @staticmethod
    def _serialize_row(row: Mapping[str, Any]) -> Dict[str, Any]:
        return {
            str(key): (bytes(value).hex() if isinstance(value, (bytes, bytearray)) else value)
            for key, value in row.items()
        }
