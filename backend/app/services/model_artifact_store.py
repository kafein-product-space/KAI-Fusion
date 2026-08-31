"""User-scoped managed storage for model artifacts uploaded through KAI-Flow.

Only opaque artifact IDs leave this module. Files are stored under a server-managed
root and are never resolved from user-provided filesystem paths.
"""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import stat
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fastapi import UploadFile

from app.core.constants import UPLOAD_DIR


COPY_CHUNK_BYTES = 1024 * 1024
LOCAL_UPLOAD_MAX_BYTES = 8 * 1024 * 1024 * 1024
DEFAULT_UPLOAD_MAX_BYTES = LOCAL_UPLOAD_MAX_BYTES
MAX_UPLOAD_MAX_BYTES = 8 * 1024 * 1024 * 1024
MIN_FREE_DISK_BYTES = 512 * 1024 * 1024
DISK_CHECK_INTERVAL_BYTES = 16 * 1024 * 1024


class ManagedArtifactError(ValueError):
    """Raised when a managed artifact reference cannot be safely resolved."""


class ManagedArtifactTooLargeError(ManagedArtifactError):
    """Raised when an upload exceeds the configured hard size limit."""


class ManagedArtifactInsufficientDiskError(ManagedArtifactError):
    """Raised when the managed artifact volume cannot safely hold the upload."""


@dataclass(frozen=True)
class ManagedArtifactRecord:
    artifact_id: str
    name: str
    size_bytes: int
    format_hint: str | None
    payload_path: Path

    def open_stream(self):
        return self.payload_path.open("rb")


def _positive_limit(value: Any, default: int = DEFAULT_UPLOAD_MAX_BYTES) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    if parsed <= 0:
        return default
    return min(parsed, MAX_UPLOAD_MAX_BYTES)


def configured_upload_max_bytes() -> int:
    # A deployment may lower this value, but cannot raise it above the
    # safe local-upload ceiling without changing this policy explicitly.
    return min(
        _positive_limit(os.getenv("KAI_MODEL_UPLOAD_MAX_BYTES")),
        LOCAL_UPLOAD_MAX_BYTES,
    )


def _available_disk_bytes(path: Path) -> int:
    try:
        return int(shutil.disk_usage(path).free)
    except OSError as exc:
        raise ManagedArtifactInsufficientDiskError(
            "The storage volume could not be checked for available disk space."
        ) from exc


def _ensure_disk_space(path: Path, required_bytes: int = 0) -> None:
    available = _available_disk_bytes(path)
    required = max(0, int(required_bytes)) + MIN_FREE_DISK_BYTES
    if available < required:
        raise ManagedArtifactInsufficientDiskError(
            "Not enough free disk space to store this model artifact safely."
        )


def _safe_display_name(value: str | None) -> str:
    raw = (value or "artifact.bin").replace("\\", "/").split("/")[-1]
    cleaned = "".join(
        character
        if character.isascii() and (character.isalnum() or character in "._-")
        else "_"
        for character in raw
    ).strip("._")
    return (cleaned or "artifact.bin")[:255]


def _format_hint(name: str) -> str | None:
    lowered = name.lower()
    if lowered.endswith(".tar.gz"):
        return "archive"
    suffix = Path(lowered).suffix
    return {
        ".gguf": "gguf",
        ".ggml": "ggml",
        ".pkl": "pickle",
        ".pickle": "pickle",
        ".pt": "pytorch",
        ".pth": "pytorch",
        ".bin": "pytorch",
        ".ckpt": "checkpoint",
        ".h5": "keras_h5",
        ".hdf5": "keras_h5",
        ".keras": "keras",
        ".pb": "tensorflow",
        ".tflite": "tflite",
        ".onnx": "onnx",
        ".safetensors": "safetensors",
        ".zip": "archive",
        ".tar": "archive",
        ".tgz": "archive",
        ".gz": "archive",
        ".7z": "archive",
    }.get(suffix)


class ManagedModelArtifactStore:
    """Persist and resolve opaque, user-owned model artifact references."""

    def __init__(self, root: str | os.PathLike[str] | None = None):
        configured_root = os.getenv("KAI_MODEL_ARTIFACT_DIR", "").strip()
        self.root = Path(
            root or configured_root or Path(UPLOAD_DIR) / "static_analysis-artifacts"
        ).resolve()

    @staticmethod
    def _owner_key(owner_id: Any) -> str:
        value = str(owner_id or "").strip()
        if not value:
            raise ManagedArtifactError("Artifact owner context is required.")
        return hashlib.sha256(value.encode("utf-8")).hexdigest()[:32]

    def _artifact_directory(self, owner_id: Any, artifact_id: str) -> Path:
        try:
            normalized_id = str(uuid.UUID(str(artifact_id)))
        except (TypeError, ValueError, AttributeError) as exc:
            raise ManagedArtifactError("Managed artifact ID is invalid.") from exc
        return self.root / self._owner_key(owner_id) / normalized_id

    async def save_upload(
        self,
        upload: UploadFile,
        *,
        owner_id: Any,
        max_bytes: Any = None,
    ) -> dict[str, Any]:
        limit = _positive_limit(max_bytes or configured_upload_max_bytes())
        artifact_id = str(uuid.uuid4())
        name = _safe_display_name(upload.filename)
        artifact_directory = self._artifact_directory(owner_id, artifact_id)
        payload_path = artifact_directory / "payload"
        manifest_path = artifact_directory / "metadata.json"
        size_bytes = 0

        self.root.mkdir(mode=0o700, parents=True, exist_ok=True)
        try:
            known_size = getattr(upload, "size", None)
            try:
                known_size = int(known_size) if known_size is not None else None
            except (TypeError, ValueError):
                known_size = None
            if known_size is not None:
                if known_size > limit:
                    raise ManagedArtifactTooLargeError(
                        "Model artifact exceeds the configured upload size limit."
                    )
                _ensure_disk_space(self.root, known_size)

            artifact_directory.mkdir(mode=0o700, parents=True, exist_ok=False)
            file_descriptor = os.open(
                payload_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600
            )
            with os.fdopen(file_descriptor, "wb") as destination:
                last_disk_check = 0
                while True:
                    chunk = await upload.read(COPY_CHUNK_BYTES)
                    if not chunk:
                        break
                    size_bytes += len(chunk)
                    if size_bytes > limit:
                        raise ManagedArtifactTooLargeError(
                            "Model artifact exceeds the configured upload size limit."
                        )
                    if size_bytes - last_disk_check >= DISK_CHECK_INTERVAL_BYTES:
                        _ensure_disk_space(self.root)
                        last_disk_check = size_bytes
                    destination.write(chunk)

            if size_bytes == 0:
                raise ManagedArtifactError("Empty model artifacts cannot be uploaded.")

            metadata = {
                "schema_version": "1.0",
                "artifact_id": artifact_id,
                "name": name,
                "size_bytes": size_bytes,
                "format": _format_hint(name),
            }
            manifest_descriptor = os.open(
                manifest_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600
            )
            with os.fdopen(manifest_descriptor, "w", encoding="utf-8") as manifest:
                json.dump(metadata, manifest, ensure_ascii=True, separators=(",", ":"))

            return {
                "storage": "managed",
                "artifact_id": artifact_id,
                "name": name,
                "size_bytes": size_bytes,
                "format": metadata["format"],
            }
        except Exception:
            shutil.rmtree(artifact_directory, ignore_errors=True)
            raise
        finally:
            await upload.close()

    def resolve(self, artifact_id: str, *, owner_id: Any) -> ManagedArtifactRecord:
        artifact_directory = self._artifact_directory(owner_id, artifact_id)
        payload_path = artifact_directory / "payload"
        manifest_path = artifact_directory / "metadata.json"
        try:
            metadata = json.loads(manifest_path.read_text(encoding="utf-8"))
            payload_stat = payload_path.stat()
        except (OSError, json.JSONDecodeError) as exc:
            raise ManagedArtifactError("Managed artifact is unavailable.") from exc

        if not stat.S_ISREG(payload_stat.st_mode) or payload_path.is_symlink():
            raise ManagedArtifactError("Managed artifact payload is invalid.")
        if str(metadata.get("artifact_id")) != str(uuid.UUID(str(artifact_id))):
            raise ManagedArtifactError("Managed artifact metadata is invalid.")

        declared_size = int(metadata.get("size_bytes", -1))
        if declared_size < 0 or declared_size != payload_stat.st_size:
            raise ManagedArtifactError("Managed artifact size validation failed.")

        return ManagedArtifactRecord(
            artifact_id=str(metadata["artifact_id"]),
            name=_safe_display_name(str(metadata.get("name") or "artifact.bin")),
            size_bytes=declared_size,
            format_hint=str(metadata.get("format") or "").lower() or None,
            payload_path=payload_path,
        )

    def delete(self, artifact_id: str, *, owner_id: Any) -> bool:
        artifact_directory = self._artifact_directory(owner_id, artifact_id)
        if not artifact_directory.exists():
            return False
        shutil.rmtree(artifact_directory)
        return True


managed_model_artifact_store = ManagedModelArtifactStore()


__all__ = [
    "ManagedArtifactError",
    "ManagedArtifactRecord",
    "ManagedArtifactInsufficientDiskError",
    "ManagedArtifactTooLargeError",
    "ManagedModelArtifactStore",
    "LOCAL_UPLOAD_MAX_BYTES",
    "MIN_FREE_DISK_BYTES",
    "configured_upload_max_bytes",
    "managed_model_artifact_store",
]
