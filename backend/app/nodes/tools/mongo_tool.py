"""
MongoDB Tool
============

Gives an agent a callable tool for working with a MongoDB database.

Where the MongoDB node runs the operation the flow author set up, this node
hands the agent a tool and lets it decide what to run. That is a good deal more
power, so the node is built around deciding how much of it to grant:

- Reading, inserting, updating and deleting are enabled one by one. Nothing but
  reading is on to begin with.
- An allow list can narrow the tool down to named collections.
- Updates and deletes can be required to carry a filter, which is what stops a
  single careless call from rewriting or emptying a whole collection.
- Aggregation stages that write or reach into another collection are refused.
- Result sets are capped so a broad query cannot flood the agent's context.
- The collections and the fields they habitually carry can be described to the
  agent, which keeps it from guessing names that do not exist.
"""

from __future__ import annotations

import re
import json
import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional, Set, Tuple

from ..base import (
    ProviderNode,
    NodeOutput,
    NodeType,
    NodeProperty,
    NodePropertyType,
    NodePosition,
)

logger = logging.getLogger(__name__)

IDENTIFIER_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
COLLECTION_PATTERN = re.compile(r"^[^$\x00.][^$\x00]*$")

# What each action is called when the agent asks for it, and which permission
# covers it.
READ_ACTIONS = {"find", "find_one", "count", "distinct", "aggregate"}
INSERT_ACTIONS = {"insert"}
UPDATE_ACTIONS = {"update", "update_one", "replace_one"}
DELETE_ACTIONS = {"delete", "delete_one"}

ALL_ACTIONS = READ_ACTIONS | INSERT_ACTIONS | UPDATE_ACTIONS | DELETE_ACTIONS

# Stages that write or read outside the collection being aggregated.
FORBIDDEN_STAGES = {"$out", "$merge", "$lookup", "$graphLookup", "$unionWith"}

# Update operators the driver understands.
UPDATE_OPERATORS = {
    "$set", "$unset", "$inc", "$mul", "$rename", "$min", "$max",
    "$currentDate", "$addToSet", "$pop", "$pull", "$push", "$pullAll",
    "$bit", "$setOnInsert",
}

MAX_SAMPLE_DOCUMENTS = 100


class MongoToolNode(ProviderNode):
    """Exposes a scoped MongoDB tool to an agent."""

    def __init__(self):
        super().__init__()
        self._metadata = {
            "name": "MongoTool",
            "display_name": "MongoDB Tool",
            "description": (
                "Let an agent read from and write to a MongoDB database. Each kind of "
                "operation is granted separately, and the tool can be limited to named "
                "collections."
            ),
            "category": "Tool",
            "node_type": NodeType.PROVIDER,
            "icon": {
                "name": "mongodb",
                "path": "icons/mongodb.svg",
                "alt": "MongoDB",
            },
            "colors": ["emerald-500", "green-600"],
            "inputs": [],
            "outputs": [
                NodeOutput(
                    name="mongo_tool",
                    displayName="MongoDB Tool",
                    type="BaseTool",
                    description="A database tool the agent can call.",
                    is_connection=True,
                    direction=NodePosition.TOP,
                ),
            ],
            "properties": [
                # ----------------------------------------------------------
                # Basic
                # ----------------------------------------------------------
                NodeProperty(
                    name="credential_id",
                    displayName="Credential",
                    type=NodePropertyType.CREDENTIAL_SELECT,
                    description="MongoDB connection the tool will use.",
                    placeholder="Select Credential",
                    required=True,
                    serviceType="mongodb",
                    tabName="basic",
                ),
                NodeProperty(
                    name="allowed_collections",
                    displayName="Allowed Collections",
                    type=NodePropertyType.DYNAMIC_SELECT,
                    description=(
                        "Collections the tool may touch. Leave empty to allow every collection "
                        "in the database."
                    ),
                    placeholder="All collections",
                    required=True,
                    default="",
                    multiple=True,
                    optionsMethod="load_collections",
                    optionsDependsOn=["credential_id"],
                    hint=(
                        "Naming the collections keeps the agent away from anything it has no "
                        "business reading, and shortens the description it has to work through."
                    ),
                    tabName="basic",
                ),
                NodeProperty(
                    name="return_all",
                    displayName="Return All Documents",
                    type=NodePropertyType.CHECKBOX,
                    description=(
                        "Return every document a read produces. Turn this off to cap the number, "
                        "which keeps a broad query from filling the agent's context."
                    ),
                    required=True,
                    default=False,
                    hint="Leaving this off is safer; the agent can always narrow its query.",
                    tabName="basic",
                ),
                NodeProperty(
                    name="max_documents",
                    displayName="Maximum Documents",
                    type=NodePropertyType.NUMBER,
                    description="Largest number of documents a single read may return.",
                    required=True,
                    default=20,
                    min=1,
                    max=200,
                    displayOptions={"show": {"return_all": False}},
                    tabName="basic",
                ),

                # --- Permissions ------------------------------------------
                NodeProperty(
                    name="permissions_title",
                    displayName="Permissions",
                    type=NodePropertyType.TITLE,
                    description="What the agent is allowed to do with the database.",
                    required=True,
                    tabName="basic",
                ),
                NodeProperty(
                    name="allow_read",
                    displayName="Allow Read",
                    type=NodePropertyType.CHECKBOX,
                    description="Let the agent read documents, count them and run aggregations.",
                    required=True,
                    default=True,
                    tabName="basic",
                ),
                NodeProperty(
                    name="allow_insert",
                    displayName="Allow Insert",
                    type=NodePropertyType.CHECKBOX,
                    description="Let the agent add documents.",
                    required=True,
                    default=False,
                    tabName="basic",
                ),
                NodeProperty(
                    name="allow_update",
                    displayName="Allow Update",
                    type=NodePropertyType.CHECKBOX,
                    description="Let the agent change existing documents.",
                    required=True,
                    default=False,
                    tabName="basic",
                ),
                NodeProperty(
                    name="allow_delete",
                    displayName="Allow Delete",
                    type=NodePropertyType.CHECKBOX,
                    description="Let the agent remove documents.",
                    required=True,
                    default=False,
                    tabName="basic",
                ),

                # ----------------------------------------------------------
                # Advanced
                # ----------------------------------------------------------
                NodeProperty(
                    name="describe_collections",
                    displayName="Describe Collections to the Agent",
                    type=NodePropertyType.CHECKBOX,
                    description=(
                        "Include the collections and the fields they carry in the tool "
                        "description. Without it the agent has to guess the names, and usually "
                        "guesses wrong."
                    ),
                    required=False,
                    default=True,
                    tabName="advanced",
                ),
                NodeProperty(
                    name="tool_name",
                    displayName="Tool Name",
                    type=NodePropertyType.TEXT,
                    description="Name the agent will see. Letters, digits and underscores only.",
                    placeholder="mongo_database",
                    required=False,
                    default="mongo_database",
                    tabName="advanced",
                ),
                NodeProperty(
                    name="tool_description",
                    displayName="Tool Description",
                    type=NodePropertyType.TEXT_AREA,
                    description=(
                        "Replaces the generated description. Leave empty to let the node write "
                        "one from the settings above."
                    ),
                    required=False,
                    default="",
                    rows=4,
                    tabName="advanced",
                ),
                NodeProperty(
                    name="operation_timeout",
                    displayName="Operation Timeout (seconds)",
                    type=NodePropertyType.NUMBER,
                    description="Cancel an operation that runs longer than this.",
                    required=False,
                    default=15,
                    min=1,
                    max=120,
                    tabName="advanced",
                ),
                NodeProperty(
                    name="case_insensitive",
                    displayName="Ignore Capitalisation",
                    type=NodePropertyType.CHECKBOX,
                    description=(
                        "Match text in a filter without regard to case, so a value the agent "
                        "writes in lower case still finds documents stored with capitals."
                    ),
                    required=False,
                    default=True,
                    tabName="advanced",
                ),
            ],
        }

    # ------------------------------------------------------------------
    # Connection
    # ------------------------------------------------------------------

    def _connection_details(self, credential_id: Optional[str]) -> Tuple[str, str]:
        """Read the credential and return the URI and the database name."""
        if not credential_id:
            raise ValueError("A MongoDB credential is required.")

        credential = self.get_credential(credential_id)
        if not credential or not credential.get("secret"):
            raise ValueError(
                "The selected credential could not be read. It may have been created with a "
                "different encryption key; try recreating it."
            )

        secret = credential["secret"]
        database = (secret.get("database") or "").strip()
        if not database:
            raise ValueError("The credential does not name a database.")

        uses_string = secret.get("configuration_type") == "connection_string" or (
            secret.get("connection_string") and not secret.get("host")
        )
        if uses_string:
            uri = (secret.get("connection_string") or "").strip()
            if not uri:
                raise ValueError("The credential does not carry a connection string.")
            return uri, database

        host = (secret.get("host") or "").strip()
        if not host:
            raise ValueError("The credential does not name a host.")

        port = str(secret.get("port") or "27017").strip()
        username = (secret.get("username") or "").strip()
        password = secret.get("password") or ""
        auth_source = (secret.get("auth_source") or "").strip()

        if username:
            from urllib.parse import quote_plus

            credentials = f"{quote_plus(username)}:{quote_plus(password)}@"
        else:
            credentials = ""

        uri = f"mongodb://{credentials}{host}:{port}"
        if auth_source:
            uri += f"/?authSource={auth_source}"
        return uri, database

    def _open_client(self, credential_id: Optional[str], timeout: int = 10):
        """Open a client and the database it points at."""
        try:
            from pymongo import MongoClient
        except ImportError as exc:
            raise ValueError(
                "The pymongo package is not installed on the server."
            ) from exc

        uri, database_name = self._connection_details(credential_id)
        client = MongoClient(
            uri,
            serverSelectionTimeoutMS=timeout * 1000,
            connectTimeoutMS=timeout * 1000,
        )
        return client, client[database_name]

    def load_collections(self, values: Dict[str, Any]) -> List[Dict[str, str]]:
        """Fill the allowed collections dropdown."""
        client = None
        try:
            client, database = self._open_client(values.get("credential_id"))
            names = sorted(database.list_collection_names())
            return [{"label": name, "value": name} for name in names]
        finally:
            if client is not None:
                client.close()

    # ------------------------------------------------------------------
    # Guards
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_list(raw: Any) -> List[str]:
        """Read a comma separated selection into a list of names."""
        if not raw:
            return []
        parts = raw if isinstance(raw, (list, tuple)) else str(raw).split(",")
        return [str(part).strip() for part in parts if str(part).strip()]

    @classmethod
    def _guard_collection(cls, name: str, allowed: List[str]) -> str:
        """Refuse a collection the tool has not been pointed at."""
        name = (name or "").strip()
        if not name:
            raise ValueError("A collection is required.")
        if not COLLECTION_PATTERN.match(name):
            raise ValueError(f"Collection '{name}' is not a usable name.")
        if allowed and name not in allowed:
            raise ValueError(
                f"This tool may only touch: {', '.join(allowed)}. "
                f"It was asked for {name}."
            )
        return name

    @staticmethod
    def _guard_permission(action: str, granted: Set[str]) -> None:
        """Refuse an action the tool has not been granted."""
        if action in READ_ACTIONS:
            needed = "read"
        elif action in INSERT_ACTIONS:
            needed = "insert"
        elif action in UPDATE_ACTIONS:
            needed = "update"
        elif action in DELETE_ACTIONS:
            needed = "delete"
        else:
            raise ValueError(
                f"'{action}' is not an action this tool knows. "
                f"Use one of: {', '.join(sorted(ALL_ACTIONS))}."
            )

        if needed not in granted:
            allowed = ", ".join(sorted(granted)) if granted else "nothing"
            raise ValueError(
                f"This tool is not allowed to {needed}. It may only: {allowed}."
            )

    @staticmethod
    def _guard_filter(action: str, query: Any) -> None:
        """
        Refuse an update or delete that would touch every document.

        Without a filter the operation runs across the whole collection, and the
        agent cannot undo that.
        """
        if action not in (UPDATE_ACTIONS | DELETE_ACTIONS):
            return
        if not isinstance(query, dict) or not query:
            raise ValueError(
                f"A {action} without a filter would affect every document in the collection. "
                "Supply a filter that picks out the documents you mean."
            )

    @staticmethod
    def _guard_pipeline(pipeline: Any) -> None:
        """Refuse a pipeline stage that writes or reaches into another collection."""
        if not isinstance(pipeline, list):
            raise ValueError("The pipeline has to be an array of stages.")
        for stage in pipeline:
            if not isinstance(stage, dict):
                raise ValueError("Every pipeline stage has to be an object.")
            for name in stage:
                if name in FORBIDDEN_STAGES:
                    raise ValueError(
                        f"The {name} stage is not allowed, because it writes to or reads from "
                        "a collection other than the one being aggregated."
                    )

    @classmethod
    def _guard_update(cls, update: Any) -> Dict[str, Any]:
        """Read the update document, wrapping a plain object in $set."""
        if not isinstance(update, dict) or not update:
            raise ValueError("An update document is required.")

        if any(key.startswith("$") for key in update):
            unknown = [
                key for key in update if key.startswith("$") and key not in UPDATE_OPERATORS
            ]
            if unknown:
                raise ValueError(
                    f"Unknown update operator: {', '.join(unknown)}. "
                    f"Supported: {', '.join(sorted(UPDATE_OPERATORS))}"
                )
            return update

        return {"$set": update}

    # ------------------------------------------------------------------
    # Filter handling
    # ------------------------------------------------------------------

    @classmethod
    def _fold_case(cls, query: Any, depth: int = 0) -> Any:
        """
        Rewrite a filter so a difference in capitalisation cannot hide a document.

        MongoDB compares text exactly, which means a filter written as
        {"city": "bursa"} passes over the documents holding "Bursa" and "BURSA".
        Documents that should have been read, updated or deleted are then quietly
        missed, and nothing in the result says so.

        A plain string is turned into a case insensitive match on the same value.
        Anything else, an operator expression or a number, is left alone.
        """
        if depth > 6 or not isinstance(query, dict):
            return query

        folded: Dict[str, Any] = {}
        for key, value in query.items():
            if key in ("$and", "$or", "$nor") and isinstance(value, list):
                folded[key] = [cls._fold_case(item, depth + 1) for item in value]
            elif key == "$not" and isinstance(value, dict):
                folded[key] = cls._fold_case(value, depth + 1)
            elif key.startswith("$"):
                folded[key] = value
            elif isinstance(value, str) and value:
                folded[key] = {"$regex": f"^{re.escape(value)}$", "$options": "i"}
            elif isinstance(value, dict):
                folded[key] = cls._fold_case(value, depth + 1)
            else:
                folded[key] = value

        return folded

    # ------------------------------------------------------------------
    # Result shaping
    # ------------------------------------------------------------------

    @classmethod
    def _serialize(cls, value: Any) -> Any:
        """Turn driver types into something that survives being written as JSON."""
        if value is None or isinstance(value, (str, int, float, bool)):
            return value
        if isinstance(value, Decimal):
            return float(value)
        if isinstance(value, (datetime, date)):
            return value.isoformat()
        if isinstance(value, (bytes, bytearray)):
            return "<binary>"
        if isinstance(value, dict):
            return {key: cls._serialize(item) for key, item in value.items()}
        if isinstance(value, (list, tuple, set)):
            return [cls._serialize(item) for item in value]
        return str(value)

    @classmethod
    def _format_documents(cls, documents: List[Dict[str, Any]], truncated: bool) -> str:
        """Render documents as JSON the model can read."""
        if not documents:
            return "The operation ran and matched no documents."

        body = json.dumps(
            [cls._serialize(document) for document in documents],
            indent=2,
            ensure_ascii=False,
        )
        lines = [body, "", f"{len(documents)} document(s)."]
        if truncated:
            lines.append(
                "The result was cut short. Narrow the filter or aggregate to see the rest."
            )
        return "\n".join(lines)

    # ------------------------------------------------------------------
    # Tool description
    # ------------------------------------------------------------------

    def _describe(self, credential_id: str, allowed: List[str]) -> str:
        """
        Summarise the collections and the fields they carry.

        There is no schema to read, so a sample of each collection is examined.
        Without this the agent has to guess the field names and usually guesses
        wrong.
        """
        client = None
        try:
            client, database = self._open_client(credential_id)
            names = allowed or sorted(database.list_collection_names())

            lines = ["", "Collections:"]
            for name in names[:20]:
                try:
                    documents = list(database[name].find({}, limit=MAX_SAMPLE_DOCUMENTS))
                except Exception:
                    continue

                fields: Set[str] = set()

                def walk(document: Any, prefix: str = "", depth: int = 0) -> None:
                    if depth > 2 or not isinstance(document, dict):
                        return
                    for key, value in document.items():
                        path = f"{prefix}{key}"
                        if isinstance(value, dict) and value and depth < 2:
                            walk(value, f"{path}.", depth + 1)
                        else:
                            fields.add(path)

                for document in documents:
                    walk(document)

                if fields:
                    shown = sorted(fields)[:25]
                    lines.append(f"  {name}: {', '.join(shown)}")
                else:
                    lines.append(f"  {name}: empty")

            return "\n".join(lines) if len(lines) > 2 else ""
        except Exception as exc:
            logger.warning(f"Could not describe the collections: {exc}")
            return ""
        finally:
            if client is not None:
                client.close()

    def _build_description(
        self,
        custom: str,
        allowed: List[str],
        granted: Set[str],
        max_documents: int,
        layout: str,
    ) -> str:
        """Write what the agent reads before deciding to call the tool."""
        if custom and custom.strip():
            return custom.strip()

        verbs = {
            "read": "read documents with find, count, distinct and aggregate",
            "insert": "add documents with insert",
            "update": "change documents with update or replace_one",
            "delete": "remove documents with delete",
        }
        can_do = [
            verbs[name] for name in ("read", "insert", "update", "delete") if name in granted
        ]
        scope = ", ".join(allowed) if allowed else "any collection in the database"

        parts = [
            "Work with a MongoDB database. The input is a JSON object naming the action, "
            "the collection and whatever that action needs.",
            f"You can {'; '.join(can_do)}." if can_do else "This tool currently grants nothing.",
            f"Scope: {scope}.",
        ]

        if max_documents:
            parts.append(
                f"Reads return at most {max_documents} documents, so filter or aggregate "
                f"rather than asking for everything."
            )
        else:
            parts.append("Reads return every matching document, so keep filters narrow.")

        if "update" in granted or "delete" in granted:
            parts.append(
                "An update or delete must carry a filter that names the documents you mean; "
                "one without a filter is refused."
            )

        parts.append(
            "Filters are matched without regard to capitalisation, so a value written in "
            "lower case still finds documents stored with capitals."
        )

        parts.append(
            "Stages that write or read another collection, such as $out, $merge and $lookup, "
            "are refused."
        )

        parts.append(
            'Examples: {"action": "find", "collection": "customers", '
            '"filter": {"address.city": "istanbul"}, "limit": 5} · '
            '{"action": "count", "collection": "orders", "filter": {"status": "pending"}} · '
            '{"action": "aggregate", "collection": "orders", '
            '"pipeline": [{"$group": {"_id": "$status", "n": {"$sum": 1}}}]} · '
            '{"action": "update", "collection": "customers", '
            '"filter": {"email": "a@b.com"}, "update": {"is_active": false}}'
        )

        return " ".join(parts) + layout

    # ------------------------------------------------------------------
    # Execution
    # ------------------------------------------------------------------

    def _setting(self, kwargs: Dict[str, Any], name: str, fallback: Any) -> Any:
        """Read a setting from the call or from the stored configuration."""
        if name in kwargs and kwargs[name] is not None:
            return kwargs[name]
        stored = getattr(self, "user_data", {}) or {}
        if name in stored and stored[name] is not None:
            return stored[name]
        return fallback

    def execute(self, **kwargs) -> Dict[str, Any]:
        """Build the tool the agent will call."""
        credential_id = self._setting(kwargs, "credential_id", None)
        allowed = self._parse_list(self._setting(kwargs, "allowed_collections", ""))
        return_all = bool(self._setting(kwargs, "return_all", False))
        max_documents = 0 if return_all else int(self._setting(kwargs, "max_documents", 20))
        timeout = int(self._setting(kwargs, "operation_timeout", 15))
        describe = bool(self._setting(kwargs, "describe_collections", True))
        fold_case = bool(self._setting(kwargs, "case_insensitive", True))
        tool_name = str(self._setting(kwargs, "tool_name", "mongo_database")).strip()
        custom_description = str(self._setting(kwargs, "tool_description", "") or "")

        granted: Set[str] = set()
        if bool(self._setting(kwargs, "allow_read", True)):
            granted.add("read")
        if bool(self._setting(kwargs, "allow_insert", False)):
            granted.add("insert")
        if bool(self._setting(kwargs, "allow_update", False)):
            granted.add("update")
        if bool(self._setting(kwargs, "allow_delete", False)):
            granted.add("delete")

        if not granted:
            raise ValueError(
                "No permission is granted, so the tool would refuse every call. "
                "Turn on at least Allow Read."
            )

        if not IDENTIFIER_PATTERN.match(tool_name):
            raise ValueError(
                f"Tool name '{tool_name}' is not usable. "
                "Use letters, digits and underscores, starting with a letter or underscore."
            )

        # Checked here so a bad credential surfaces while the flow is being
        # built rather than in the middle of a conversation.
        self._connection_details(credential_id)

        logger.info(
            "MongoTool ready: collections=%s granted=%s max_documents=%s",
            allowed or "all", sorted(granted), max_documents,
        )

        def run(request: str) -> str:
            """Called by the agent. Returns documents as text, or an explanation."""
            request = (request or "").strip()
            if not request:
                return "No request was supplied."

            try:
                payload = json.loads(request)
            except json.JSONDecodeError as exc:
                return (
                    f"Refused: the input has to be a JSON object. It could not be read: {exc}"
                )

            if not isinstance(payload, dict):
                return "Refused: the input has to be a JSON object naming an action."

            action = str(payload.get("action") or "").strip().lower()
            query = payload.get("filter") or {}

            try:
                self._guard_permission(action, granted)
                collection_name = self._guard_collection(
                    payload.get("collection", ""), allowed
                )
                self._guard_filter(action, query)
            except ValueError as exc:
                # Handed back as text so the agent can correct itself.
                return f"Refused: {exc}"

            if not isinstance(query, dict):
                return "Refused: the filter has to be a JSON object."

            if fold_case:
                # The agent does not have to guess how a value was capitalised
                # when it was stored.
                query = self._fold_case(query)

            client = None
            try:
                client, database = self._open_client(credential_id, timeout)
                collection = database[collection_name]
                milliseconds = timeout * 1000

                if action in ("find", "find_one"):
                    projection = payload.get("fields")
                    fields = (
                        {name: 1 for name in projection}
                        if isinstance(projection, list) and projection
                        else None
                    )
                    sort = payload.get("sort")
                    sort_spec = (
                        [(key, -1 if str(value).lower() in ("desc", "-1") else 1)
                         for key, value in sort.items()]
                        if isinstance(sort, dict) and sort
                        else None
                    )

                    if action == "find_one":
                        found = collection.find_one(
                            query, fields, sort=sort_spec, max_time_ms=milliseconds
                        )
                        return self._format_documents([found] if found else [], False)

                    cursor = collection.find(query, fields, max_time_ms=milliseconds)
                    if sort_spec:
                        cursor = cursor.sort(sort_spec)

                    # The agent may ask for fewer than the cap, never for more.
                    asked = payload.get("limit")
                    cap = max_documents
                    if isinstance(asked, int) and asked > 0:
                        cap = min(asked, max_documents) if max_documents else asked

                    if cap:
                        documents = list(cursor.limit(cap + 1))
                        truncated = len(documents) > cap
                        documents = documents[:cap]
                    else:
                        documents = list(cursor)
                        truncated = False

                    return self._format_documents(documents, truncated)

                if action == "count":
                    total = collection.count_documents(query, maxTimeMS=milliseconds)
                    return f"{total} document(s) match."

                if action == "distinct":
                    field = str(payload.get("field") or "").strip()
                    if not field:
                        return "Refused: distinct needs a field to work on."
                    values = collection.distinct(field, query)
                    return self._format_documents(
                        [{field: value} for value in values], False
                    )

                if action == "aggregate":
                    pipeline = payload.get("pipeline")
                    try:
                        self._guard_pipeline(pipeline)
                    except ValueError as exc:
                        return f"Refused: {exc}"
                    documents = list(
                        collection.aggregate(pipeline, maxTimeMS=milliseconds)
                    )
                    truncated = False
                    if max_documents and len(documents) > max_documents:
                        documents = documents[:max_documents]
                        truncated = True
                    return self._format_documents(documents, truncated)

                if action == "insert":
                    documents = payload.get("documents") or payload.get("document")
                    if isinstance(documents, dict):
                        documents = [documents]
                    if not isinstance(documents, list) or not documents:
                        return "Refused: insert needs a document or a list of documents."
                    result = collection.insert_many(documents)
                    return f"Inserted {len(result.inserted_ids)} document(s)."

                if action in ("update", "update_one"):
                    try:
                        update = self._guard_update(payload.get("update"))
                    except ValueError as exc:
                        return f"Refused: {exc}"

                    if action == "update_one":
                        result = collection.update_one(query, update)
                    else:
                        result = collection.update_many(query, update)
                    return (
                        f"Matched {result.matched_count} document(s), "
                        f"changed {result.modified_count}."
                    )

                if action == "replace_one":
                    replacement = payload.get("document")
                    if not isinstance(replacement, dict) or not replacement:
                        return "Refused: replace_one needs a replacement document."
                    if any(key.startswith("$") for key in replacement):
                        return (
                            "Refused: a replacement cannot hold update operators. "
                            "Use the update action for that."
                        )
                    result = collection.replace_one(query, replacement)
                    return (
                        f"Matched {result.matched_count} document(s), "
                        f"replaced {result.modified_count}."
                    )

                if action in ("delete", "delete_one"):
                    if action == "delete_one":
                        result = collection.delete_one(query)
                    else:
                        result = collection.delete_many(query)
                    return f"Deleted {result.deleted_count} document(s)."

                return f"Refused: '{action}' is not an action this tool knows."

            except Exception as exc:
                message = str(exc).strip()
                logger.warning(f"MongoTool call failed: {message}")
                return f"The database rejected the request: {message}"
            finally:
                if client is not None:
                    client.close()

        layout = self._describe(credential_id, allowed) if describe else ""
        description = self._build_description(
            custom_description, allowed, granted, max_documents, layout
        )

        from langchain_core.tools import Tool

        return {
            "mongo_tool": {
                "tool": Tool(name=tool_name, description=description, func=run)
            }
        }

    def get_required_packages(self) -> List[str]:
        """Packages this node needs."""
        return ["pymongo>=4.0.0", "langchain-core>=0.1.0"]


__all__ = ["MongoToolNode"]
