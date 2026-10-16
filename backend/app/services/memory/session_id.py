"""Stable, bounded identifiers for automatically configured memory nodes."""

import json
import uuid


def automatic_memory_session_id(base_session_id: str, node_id: str, workflow_id: str) -> str:
    """Isolate each memory node within a workflow conversation."""
    if not base_session_id or not node_id or not workflow_id:
        raise ValueError("Automatic memory requires a session, node and workflow ID.")
    scope = json.dumps([str(workflow_id), str(base_session_id), str(node_id)])
    return f"mem_{uuid.uuid5(uuid.NAMESPACE_URL, scope)}"
