from collections.abc import Iterable, Mapping
from typing import Literal

ExecutionStatus = Literal["pending", "success", "failed"]


def build_execution_edge_statuses(
    transmitted_edge_ids: Iterable[str] = (),
    *,
    dependency_edge_statuses: Mapping[str, str] | None = None,
    failed_edge_ids: Iterable[str] = (),
) -> dict[str, ExecutionStatus]:
    """Combine observed control-flow edges with actually used dependency edges."""
    statuses: dict[str, ExecutionStatus] = {
        str(edge_id): "success"
        for edge_id in transmitted_edge_ids
        if edge_id
    }

    for edge_id, status in (dependency_edge_statuses or {}).items():
        if edge_id and status in {"pending", "success", "failed"}:
            statuses[str(edge_id)] = status

    for edge_id in failed_edge_ids:
        if edge_id:
            statuses[str(edge_id)] = "failed"

    return statuses
