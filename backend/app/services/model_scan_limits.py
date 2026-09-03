"""Central deployment limits for model scanning and managed uploads."""

from __future__ import annotations

import os
from typing import Any


MIB = 1024 * 1024
GIB = 1024 * MIB
TIB = 1024 * GIB

DEFAULT_ARTIFACT_MAX_BYTES = 256 * GIB
HARD_ARTIFACT_MAX_BYTES = 1 * TIB

DEFAULT_ARCHIVE_EXPANDED_MAX_BYTES = 256 * GIB
HARD_ARCHIVE_EXPANDED_MAX_BYTES = 1 * TIB

# Browser uploads still traverse the application API. Larger interactive
# transfers should use a service-visible path or object storage until resumable
# direct-to-object-storage upload is available.
DEFAULT_MANAGED_UPLOAD_MAX_BYTES = 8 * GIB
HARD_MANAGED_UPLOAD_MAX_BYTES = 8 * GIB

DEFAULT_PICKLE_MAX_BYTES = 256 * MIB
HARD_PICKLE_MAX_BYTES = 2 * GIB

DEFAULT_WORKER_MEMORY_BYTES = 4 * GIB
MIN_WORKER_MEMORY_BYTES = 512 * MIB
HARD_WORKER_MEMORY_BYTES = 16 * GIB


def _configured_bytes(name: str, default: int, hard_maximum: int) -> int:
    value: Any = os.getenv(name)
    try:
        parsed = int(value) if value not in (None, "") else default
    except (TypeError, ValueError):
        return default
    if parsed <= 0:
        return default
    return min(parsed, hard_maximum)


def configured_artifact_max_bytes() -> int:
    return _configured_bytes(
        "KAI_MODEL_MAX_ARTIFACT_BYTES",
        DEFAULT_ARTIFACT_MAX_BYTES,
        HARD_ARTIFACT_MAX_BYTES,
    )


def configured_archive_expanded_max_bytes() -> int:
    return _configured_bytes(
        "KAI_MODEL_ARCHIVE_MAX_EXPANDED_BYTES",
        DEFAULT_ARCHIVE_EXPANDED_MAX_BYTES,
        HARD_ARCHIVE_EXPANDED_MAX_BYTES,
    )


def configured_managed_upload_max_bytes() -> int:
    return _configured_bytes(
        "KAI_MODEL_UPLOAD_MAX_BYTES",
        DEFAULT_MANAGED_UPLOAD_MAX_BYTES,
        HARD_MANAGED_UPLOAD_MAX_BYTES,
    )


def configured_worker_memory_bytes() -> int:
    configured = _configured_bytes(
        "KAI_MODEL_SCAN_MEMORY_LIMIT_BYTES",
        DEFAULT_WORKER_MEMORY_BYTES,
        HARD_WORKER_MEMORY_BYTES,
    )
    return max(MIN_WORKER_MEMORY_BYTES, configured)


def public_scan_limits() -> dict[str, int]:
    """Return non-secret limits used to keep clients aligned with deployment policy."""

    return {
        "artifact_max_bytes": configured_artifact_max_bytes(),
        "artifact_hard_max_bytes": HARD_ARTIFACT_MAX_BYTES,
        "archive_expanded_max_bytes": configured_archive_expanded_max_bytes(),
        "archive_expanded_hard_max_bytes": HARD_ARCHIVE_EXPANDED_MAX_BYTES,
        "managed_upload_max_bytes": configured_managed_upload_max_bytes(),
        "managed_upload_hard_max_bytes": HARD_MANAGED_UPLOAD_MAX_BYTES,
        "pickle_default_max_bytes": DEFAULT_PICKLE_MAX_BYTES,
        "pickle_hard_max_bytes": HARD_PICKLE_MAX_BYTES,
        "worker_memory_bytes": configured_worker_memory_bytes(),
    }


__all__ = [
    "DEFAULT_ARTIFACT_MAX_BYTES",
    "DEFAULT_ARCHIVE_EXPANDED_MAX_BYTES",
    "DEFAULT_MANAGED_UPLOAD_MAX_BYTES",
    "DEFAULT_PICKLE_MAX_BYTES",
    "DEFAULT_WORKER_MEMORY_BYTES",
    "GIB",
    "HARD_ARTIFACT_MAX_BYTES",
    "HARD_ARCHIVE_EXPANDED_MAX_BYTES",
    "HARD_MANAGED_UPLOAD_MAX_BYTES",
    "HARD_PICKLE_MAX_BYTES",
    "HARD_WORKER_MEMORY_BYTES",
    "MIB",
    "MIN_WORKER_MEMORY_BYTES",
    "TIB",
    "configured_archive_expanded_max_bytes",
    "configured_artifact_max_bytes",
    "configured_managed_upload_max_bytes",
    "configured_worker_memory_bytes",
    "public_scan_limits",
]
