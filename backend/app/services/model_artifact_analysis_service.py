"""Safe adapter for statically scanning model artifacts with Static model analysis.

This module deliberately keeps storage resolution, bounded streaming, direct
path handling, temporary file handling for stream-only sources, process
isolation, and result normalization outside workflow nodes.  The public
service accepts KAI-Flow artifact references, validated managed-upload or
MinIO references, and explicit service-local paths; it never accepts URLs or
raw model bytes.
"""

from __future__ import annotations

import hashlib
import json
import logging
import multiprocessing
import os
import re
import shutil
import stat
import tempfile
import time
import unicodedata
import uuid
import zipfile
from collections.abc import Callable, Mapping, Sequence
from contextlib import contextmanager
from copy import deepcopy
from dataclasses import dataclass
from importlib import metadata as importlib_metadata
from pathlib import Path
from typing import Any, Protocol

from pydantic import BaseModel, ConfigDict, Field, PrivateAttr

from app.services.model_artifact_store import (
    DISK_CHECK_INTERVAL_BYTES,
    ManagedArtifactError,
    MIN_FREE_DISK_BYTES,
    managed_model_artifact_store,
)
from app.services.minio_service import minio_service
from app.services.model_security_error_catalog import enrich_security_finding

# Static model analysis reads these flags during import.  Keep them above every code path
# that can import the package, including the in-process test runner.
os.environ["PROMPTFOO_DISABLE_TELEMETRY"] = "1"
os.environ["NO_ANALYTICS"] = "1"

logger = logging.getLogger(__name__)

STATIC_ANALYSIS_VERSION = "0.2.52"
SCHEMA_VERSION = "1.0"
# MinIO-backed model scans are staged on the server, so their default limit is
# independent from the local browser-upload limit in model_artifact_store.
DEFAULT_MAX_BYTES = 8 * 1024 * 1024 * 1024
DEFAULT_TIMEOUT_SECONDS = 300
MAX_MAX_BYTES = 8 * 1024 * 1024 * 1024
MAX_TIMEOUT_SECONDS = 3600
COPY_CHUNK_BYTES = 1024 * 1024
MAX_ENGINE_FINDINGS = 50
MAX_ENGINE_CHECKS = 512
MAX_FINDING_TEXT = 320
MAX_ARCHIVE_ENTRIES = 512
MAX_ARCHIVE_DEPTH = 3
MAX_ARCHIVE_MEMBER_NAME = 240

_SAFE_SCANNER_ID = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")
_SAFE_FILENAME_CHAR = re.compile(r"[^A-Za-z0-9._-]+")
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

_FORMAT_BY_SUFFIX = {
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
    ".meta": "tensorflow",
    ".tflite": "tflite",
    ".onnx": "onnx",
    ".safetensors": "safetensors",
    ".zip": "archive",
    ".tar": "archive",
    ".tgz": "archive",
    ".gz": "archive",
    ".bz2": "archive",
    ".xz": "archive",
    ".zst": "archive",
    ".7z": "archive",
    ".mar": "archive",
}


def installed_static_analysis_version() -> str:
    try:
        return importlib_metadata.version("modelaudit")
    except importlib_metadata.PackageNotFoundError:
        return STATIC_ANALYSIS_VERSION


def _normalize_analysis_extension(value: Any) -> str:
    extension = str(value or "").strip().lower()
    if not extension or extension == "*":
        return ""
    return extension if extension.startswith(".") else f".{extension}"


def get_static_analysis_capabilities() -> dict[str, Any]:
    """Read supported routes from the installed Static model analysis registry at runtime."""

    fallback_extensions = sorted(set(_FORMAT_BY_SUFFIX))
    capabilities: dict[str, Any] = {
        "version": installed_static_analysis_version(),
        "extensions": fallback_extensions,
        "filenames": [],
        "scanner_extensions": {},
    }
    try:
        from modelaudit.scanners import _registry  # noqa: PLC0415

        scanner_ids = _registry.get_available_scanners()
        extensions: set[str] = set()
        filenames: set[str] = set()
        scanner_extensions: dict[str, list[str]] = {}
        for scanner_id in scanner_ids:
            info = _registry.get_scanner_info(scanner_id) or {}
            scanner_id = str(scanner_id).strip().lower()
            routes = sorted(
                {
                    normalized
                    for raw in list(info.get("extensions", []) or [])
                    + list(info.get("content_routed_extensions", []) or [])
                    if (normalized := _normalize_analysis_extension(raw))
                }
            )
            names = sorted(
                {
                    str(raw).strip().lower()
                    for raw in list(info.get("content_routed_filenames", []) or [])
                    if str(raw).strip()
                }
            )
            if routes:
                scanner_extensions[scanner_id] = routes
                extensions.update(routes)
            filenames.update(names)

        if extensions:
            capabilities["extensions"] = sorted(extensions)
        capabilities["filenames"] = sorted(filenames)
        capabilities["scanner_extensions"] = scanner_extensions
    except Exception as exc:
        logger.warning(
            "Static model analysis scanner capabilities could not be discovered: error_type=%s",
            type(exc).__name__,
        )
        capabilities["error"] = "Static model analysis scanner registry is unavailable."
    return capabilities

class ArtifactReferenceError(ValueError):
    """Raised when a value is not a trusted KAI-Flow artifact reference."""


class ArtifactTooLargeError(ValueError):
    """Raised when the configured streaming size budget is exceeded."""


class ArtifactDiskSpaceError(RuntimeError):
    """Raised when staging would consume the safety reserve on its volume."""


class ModelArtifactAnalysisRunnerError(RuntimeError):
    """Raised when the isolated scanner runner cannot produce a result."""


class ModelArtifactAnalysisTimeoutError(ModelArtifactAnalysisRunnerError):
    """Raised when the isolated scanner exceeds its deadline."""


def _ensure_staging_disk_space(path: str | os.PathLike[str], required_bytes: int = 0) -> None:
    try:
        available = int(shutil.disk_usage(path).free)
    except OSError as exc:
        raise ArtifactDiskSpaceError(
            "The staging volume could not be checked for available disk space."
        ) from exc
    required = max(0, int(required_bytes)) + MIN_FREE_DISK_BYTES
    if available < required:
        raise ArtifactDiskSpaceError(
            "Not enough free disk space to stage this model artifact safely."
        )


class ModelArtifact(BaseModel):
    """KAI-Flow model artifact reference containing metadata, never bytes.

    The stream factory is a Pydantic private attribute, so workflow tracing and
    serialization see only the safe public metadata below.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    name: str = Field(min_length=1, max_length=512)
    size_bytes: int | None = Field(default=None, ge=0)
    format_hint: str | None = Field(default=None, max_length=64)
    reference_id: str | None = Field(default=None, max_length=128)
    storage: str = Field(default="connected", max_length=32)
    _stream_factory: Callable[[], Any] = PrivateAttr()
    _direct_path: str | None = PrivateAttr(default=None)

    def __init__(
        self,
        *,
        stream_factory: Callable[[], Any],
        direct_path: str | os.PathLike[str] | None = None,
        **data: Any,
    ):
        super().__init__(**data)
        self._stream_factory = stream_factory
        self._direct_path = os.fspath(direct_path) if direct_path is not None else None

    def open_stream(self) -> Any:
        """Open a fresh binary stream for one bounded scan."""

        stream = self._stream_factory()
        if stream is None or not callable(getattr(stream, "read", None)):
            raise ArtifactReferenceError(
                "Artifact reference did not provide a readable stream."
            )
        return stream

    @property
    def direct_path(self) -> str | None:
        """Return a validated service-local path when the source already exists on disk."""

        return self._direct_path

    def __repr__(self) -> str:
        return "ModelArtifact(name={!r}, size_bytes={!r}, format_hint={!r}, storage={!r})".format(
            self.name,
            self.size_bytes,
            self.format_hint,
            self.storage,
        )


@dataclass(frozen=True)
class StagedModelArtifact:
    """Service-owned path shared by trusted scanner adapters for one run."""

    artifact: ModelArtifact
    path: str
    name: str
    format: str
    size_bytes: int
    sha256: str
    deadline_monotonic: float
    max_bytes: int = MAX_MAX_BYTES

    def remaining_seconds(self) -> int:
        return max(1, int(self.deadline_monotonic - time.monotonic()))


class ModelArtifactAnalysisRunner(Protocol):
    """Boundary that can later be replaced by a remote sandbox/container."""

    def run(
        self,
        path: str,
        config: dict[str, Any],
        timeout_seconds: int,
        artifact_name: str,
    ) -> dict[str, Any]:
        """Run Static model analysis against one service-owned artifact path."""


def sanitize_artifact_name(name: str | None) -> str:
    """Return a short basename safe for a private temporary directory."""

    raw = unicodedata.normalize("NFKC", str(name or "artifact.bin"))
    basename = raw.replace("\\", "/").rsplit("/", 1)[-1]
    basename = _CONTROL_CHARS.sub("", basename)
    basename = _SAFE_FILENAME_CHAR.sub("_", basename).strip(" ._")
    if not basename:
        basename = "artifact.bin"
    if len(basename) > 120:
        suffix = Path(basename).suffix[:20]
        stem_limit = max(1, 120 - len(suffix))
        basename = f"{Path(basename).stem[:stem_limit]}{suffix}"
    return basename


def detect_artifact_format(
    name: str, scanner: str | None = None, format_hint: str | None = None
) -> str:
    """Resolve a bounded format label without opening or loading the artifact."""

    hint = str(format_hint or "").strip().lower()
    if hint and _SAFE_SCANNER_ID.fullmatch(hint):
        return hint

    scanner_name = str(scanner or "").strip().lower()
    if scanner_name and scanner_name not in {"unknown", "skipped", "none"}:
        scanner_aliases = {
            "pytorch_zip": "pytorch",
            "pytorch_binary": "pytorch",
            "keras_zip": "keras",
            "keras_h5": "keras_h5",
            "tf_savedmodel": "tensorflow",
            "tf_metagraph": "tensorflow",
            "sevenzip": "archive",
            "zip": "archive",
            "tar": "archive",
            "compressed": "archive",
        }
        return scanner_aliases.get(scanner_name, scanner_name)

    lowered = name.lower()
    if lowered.endswith((".tar.gz", ".tar.bz2", ".tar.xz", ".tar.zst")):
        return "archive"
    known_format = _FORMAT_BY_SUFFIX.get(Path(lowered).suffix)
    if known_format:
        return known_format
    for extension in sorted(
        get_static_analysis_capabilities().get("extensions", []),
        key=len,
        reverse=True,
    ):
        if lowered.endswith(extension):
            return extension.lstrip(".").replace(".", "_") or "unknown"
    return "unknown"


def _safe_text(
    value: Any, *, replace_path: str | None = None, artifact_name: str = "artifact"
) -> str:
    text = unicodedata.normalize("NFKC", str(value or ""))
    if replace_path:
        text = text.replace(replace_path, artifact_name)
    text = _CONTROL_CHARS.sub("", text)
    text = " ".join(text.split())
    return text[:MAX_FINDING_TEXT]


def _severity_value(value: Any) -> str:
    raw = getattr(value, "value", value)
    normalized = str(raw or "info").lower().split(".")[-1]
    return (
        normalized if normalized in {"critical", "warning", "info", "debug"} else "info"
    )


def _bounded_metadata_value(value: Any, *, artifact_name: str) -> Any:
    """Keep allowlisted engine metadata small, primitive, and JSON-safe."""

    if value is None or isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, str):
        return _safe_text(value, artifact_name=artifact_name)
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return [
            _safe_text(item, artifact_name=artifact_name) for item in list(value)[:32]
        ]
    return _safe_text(value, artifact_name=artifact_name)


def _bounded_check_results(
    checks: Any, path: str, artifact_name: str
) -> list[dict[str, Any]]:
    """Expose every bounded Static model analysis check without leaking raw details."""

    if not isinstance(checks, list):
        return []

    bounded: list[dict[str, Any]] = []
    for raw_check in checks[:MAX_ENGINE_CHECKS]:
        check = raw_check if isinstance(raw_check, Mapping) else {}
        item = {
            "name": _safe_text(
                check.get("name") or "Static model analysis check",
                artifact_name=artifact_name,
            ),
            "status": _safe_text(
                check.get("status") or "unknown",
                artifact_name=artifact_name,
            ),
            "message": _safe_text(
                check.get("message"),
                replace_path=path,
                artifact_name=artifact_name,
            ),
        }
        if check.get("severity") not in (None, ""):
            item["severity"] = _severity_value(check.get("severity"))
        for source_key, target_key in (
            ("rule_code", "rule_code"),
            ("why", "why"),
            ("location", "location"),
        ):
            if check.get(source_key) not in (None, ""):
                item[target_key] = _safe_text(
                    check[source_key],
                    replace_path=path,
                    artifact_name=artifact_name,
                )
        scanner_rule_code = item.get("rule_code")
        if scanner_rule_code:
            item.update(
                enrich_security_finding(
                    "ModelAudit",
                    scanner_rule_code,
                    severity=check.get("severity"),
                    message=item.get("message"),
                )
            )
        bounded.append(item)
    return bounded


def _bounded_engine_payload(
    result: Any, path: str, artifact_name: str, engine_version: str
) -> dict[str, Any]:
    """Reduce Static model analysis output before it crosses the process boundary."""

    raw = result.to_dict() if callable(getattr(result, "to_dict", None)) else result
    if not isinstance(raw, Mapping):
        raise ModelArtifactAnalysisRunnerError("Static model analysis returned an invalid result contract.")

    raw_issues = raw.get("issues")
    issues: list[Any] = raw_issues if isinstance(raw_issues, list) else []
    raw_checks = raw.get("checks")
    tests = _bounded_check_results(raw_checks, path, artifact_name)
    counts = {"critical": 0, "warning": 0, "info": 0}
    findings: list[dict[str, Any]] = []
    severity_rank = {"critical": 0, "warning": 1, "info": 2, "debug": 3}

    for issue in issues:
        issue_map = issue if isinstance(issue, Mapping) else {}
        severity = _severity_value(issue_map.get("severity"))
        if severity != "debug":
            counts[severity] += 1
        finding = {
            "severity": severity,
            "title": _safe_text(
                issue_map.get("type") or "Static model analysis finding",
                artifact_name=artifact_name,
            ),
            "message": _safe_text(
                issue_map.get("message"), replace_path=path, artifact_name=artifact_name
            ),
        }
        rule_code = _safe_text(issue_map.get("rule_code"), artifact_name=artifact_name)
        why = _safe_text(
            issue_map.get("why"), replace_path=path, artifact_name=artifact_name
        )
        if rule_code:
            finding["rule_code"] = rule_code
        if why:
            finding["why"] = why
        finding.update(
            enrich_security_finding(
                "ModelAudit",
                rule_code,
                severity=issue_map.get("severity"),
                message=finding.get("message"),
            )
        )
        findings.append(finding)

    findings.sort(key=lambda item: severity_rank.get(str(item.get("severity")), 4))
    raw_metadata = raw.get("metadata")
    metadata: Mapping[str, Any] = (
        raw_metadata if isinstance(raw_metadata, Mapping) else {}
    )
    safe_metadata_keys = {
        "analysis_incomplete",
        "format",
        "operational_error",
        "scan_outcome",
        "scan_outcome_reasons",
        "scanner_dependency_ids",
        "skipped_scanner_ids",
        "validated_format",
    }
    safe_metadata = {
        key: _bounded_metadata_value(metadata[key], artifact_name=artifact_name)
        for key in safe_metadata_keys
        if key in metadata
    }

    return {
        "scanner": _safe_text(
            raw.get("scanner") or "unknown", artifact_name=artifact_name
        ),
        "success": bool(raw.get("success", False)),
        "duration_ms": max(0, int(float(raw.get("duration", 0.0) or 0.0) * 1000)),
        "checks": max(0, int(raw.get("total_checks", 0) or 0)),
        "counts": counts,
        "findings": findings[:MAX_ENGINE_FINDINGS],
        "findings_total": len(findings),
        "tests": tests,
        "tests_total": len(raw_checks) if isinstance(raw_checks, list) else 0,
        "tests_truncated": (
            isinstance(raw_checks, list) and len(raw_checks) > len(tests)
        ),
        "metadata": safe_metadata,
        "engine_version": engine_version,
    }


def _execute_static_analysis(
    path: str, config: dict[str, Any], artifact_name: str
) -> dict[str, Any]:
    """Import and invoke Static model analysis only after telemetry has been disabled."""

    os.environ["PROMPTFOO_DISABLE_TELEMETRY"] = "1"
    os.environ["NO_ANALYTICS"] = "1"
    logging.getLogger("modelaudit").setLevel(logging.ERROR)
    logging.getLogger("modelaudit.scanners").setLevel(logging.ERROR)

    from modelaudit import scan_file  # noqa: PLC0415 - required telemetry ordering

    engine_version = importlib_metadata.version("modelaudit")
    result = scan_file(path, config=config)
    return _bounded_engine_payload(result, path, artifact_name, engine_version)


def _static_analysis_process_entry(
    send_connection: Any, path: str, config: dict[str, Any], artifact_name: str
) -> None:
    try:
        payload = _execute_static_analysis(path, config, artifact_name)
        send_connection.send({"ok": True, "result": payload})
    except (
        BaseException
    ) as exc:  # Child failures must cross the boundary as a bounded status only.
        try:
            send_connection.send({"ok": False, "error_type": type(exc).__name__})
        except BaseException:
            pass
    finally:
        send_connection.close()


class ProcessModelArtifactAnalysisRunner:
    """Run Static model analysis in a killable child process with a strict deadline."""

    def __init__(self, start_method: str = "spawn"):
        self._context: Any = multiprocessing.get_context(start_method)

    def run(
        self,
        path: str,
        config: dict[str, Any],
        timeout_seconds: int,
        artifact_name: str,
    ) -> dict[str, Any]:
        receive_connection, send_connection = self._context.Pipe(duplex=False)
        process = self._context.Process(
            target=_static_analysis_process_entry,
            args=(send_connection, path, config, artifact_name),
            daemon=True,
        )
        try:
            process.start()
            send_connection.close()
            if not receive_connection.poll(timeout_seconds):
                if process.is_alive():
                    process.terminate()
                    process.join(timeout=2)
                if process.is_alive():
                    process.kill()
                    process.join(timeout=2)
                raise ModelArtifactAnalysisTimeoutError("Static model analysis scan timed out.")

            try:
                message = receive_connection.recv()
            except EOFError as exc:
                raise ModelArtifactAnalysisRunnerError(
                    "Static model analysis worker exited without a result."
                ) from exc
            process.join(timeout=2)

            if not isinstance(message, Mapping) or not message.get("ok"):
                raise ModelArtifactAnalysisRunnerError("Static model analysis worker failed.")
            result = message.get("result")
            if not isinstance(result, dict):
                raise ModelArtifactAnalysisRunnerError(
                    "Static model analysis worker returned an invalid result."
                )
            return result
        finally:
            receive_connection.close()
            try:
                send_connection.close()
            except OSError:
                pass
            if process.is_alive():
                process.terminate()
                process.join(timeout=2)
            try:
                process.close()
            except ValueError:
                pass


class InProcessModelArtifactAnalysisRunner:
    """Deterministic runner for integration tests; production uses the process runner."""

    def run(
        self,
        path: str,
        config: dict[str, Any],
        timeout_seconds: int,
        artifact_name: str,
    ) -> dict[str, Any]:
        return _execute_static_analysis(path, config, artifact_name)


def _artifact_storage(value: Mapping[str, Any]) -> str:
    storage = str(value.get("storage") or value.get("provider") or "").lower()
    # Keep previously saved MinIO references readable while removing the
    # generic cloud-provider surface from new workflow configurations.
    if storage == "s3" and str(value.get("cloud_provider") or "").lower() == "minio":
        return "minio"
    return storage


def _unwrap_artifact_value(value: Any, depth: int = 0) -> Any:
    if depth > 6 or not isinstance(value, Mapping):
        return value
    if _artifact_storage(value) in {"minio", "managed"}:
        return value
    for key in ("artifact", "output", "value"):
        if key in value:
            candidate = _unwrap_artifact_value(value[key], depth + 1)
            if candidate is not value[key] or isinstance(candidate, ModelArtifact):
                return candidate
            if isinstance(value[key], Mapping):
                return candidate
    return value


def _credential_secret(credential: Any) -> Mapping[str, Any]:
    if not isinstance(credential, Mapping):
        raise ArtifactReferenceError("Artifact storage credential is unavailable.")
    secret = credential.get("secret")
    if not isinstance(secret, Mapping):
        raise ArtifactReferenceError("Artifact storage credential is invalid.")
    return secret


def _minio_artifact_from_mapping(
    value: Mapping[str, Any],
    credential_lookup: Callable[[str], Any] | None,
) -> ModelArtifact:
    if credential_lookup is None:
        raise ArtifactReferenceError(
            "A credential resolver is required for stored artifacts."
        )
    cloud_provider = str(value.get("cloud_provider") or "").strip().lower()
    if cloud_provider and cloud_provider != "minio":
        raise ArtifactReferenceError("Only MinIO sources are supported.")

    credential_id = str(value.get("credential_id") or "").strip()
    bucket = str(value.get("bucket") or value.get("bucket_name") or "").strip()
    object_key = str(value.get("object_key") or value.get("key") or "").strip()
    if not credential_id or not bucket or not object_key or "\x00" in object_key:
        raise ArtifactReferenceError("Stored artifact reference is incomplete.")

    secret = _credential_secret(credential_lookup(credential_id))
    endpoint = str(secret.get("endpoint") or "").strip()
    access_key = str(
        secret.get("access_key") or secret.get("username") or secret.get("id") or ""
    ).strip()
    secret_key = str(
        secret.get("secret_key") or secret.get("password") or secret.get("secret") or ""
    ).strip()
    if not endpoint or not access_key or not secret_key:
        raise ArtifactReferenceError("Artifact storage credential is incomplete.")
    if endpoint.startswith("http://"):
        endpoint = endpoint[7:]
    elif endpoint.startswith("https://"):
        endpoint = endpoint[8:]
    use_ssl = secret.get("use_ssl") is True or str(
        secret.get("use_ssl", "")
    ).lower() in {"1", "true", "yes"}

    try:
        client = minio_service.get_client(
            endpoint,
            access_key,
            secret_key,
            use_ssl=use_ssl,
            region_name=secret.get("region") or secret.get("aws_region"),
        )
        head = client.head_object(Bucket=bucket, Key=object_key)
        size_bytes = int(head.get("ContentLength", 0))
    except Exception as exc:
        raise ArtifactReferenceError("Stored artifact could not be opened.") from exc

    def open_stream() -> Any:
        try:
            response = client.get_object(Bucket=bucket, Key=object_key)
            return response["Body"]
        except Exception as exc:
            raise ArtifactReferenceError(
                "Stored artifact stream could not be opened."
            ) from exc

    safe_name = sanitize_artifact_name(str(value.get("name") or object_key))
    reference_digest = hashlib.sha256(
        f"{credential_id}\0{bucket}\0{object_key}".encode()
    ).hexdigest()[:24]
    return ModelArtifact(
        name=safe_name,
        size_bytes=size_bytes,
        format_hint=str(value.get("format") or "").lower() or None,
        reference_id=f"minio:{reference_digest}",
        storage="minio",
        stream_factory=open_stream,
    )


def _managed_artifact_from_mapping(
    value: Mapping[str, Any], owner_id: Any
) -> ModelArtifact:
    artifact_id = str(value.get("artifact_id") or "").strip()
    try:
        record = managed_model_artifact_store.resolve(
            artifact_id, owner_id=owner_id
        )
    except ManagedArtifactError as exc:
        raise ArtifactReferenceError(str(exc)) from exc
    return ModelArtifact(
        name=record.name,
        size_bytes=record.size_bytes,
        format_hint=record.format_hint,
        reference_id=f"managed:{record.artifact_id}",
        storage="managed",
        stream_factory=record.open_stream,
        direct_path=record.payload_path,
    )


def _local_path_artifact_from_mapping(value: Mapping[str, Any]) -> ModelArtifact:
    source_type = str(value.get("source_type") or value.get("storage") or "").strip().lower()
    if source_type not in {"path", "local_path", "direct"}:
        raise ArtifactReferenceError(
            "A local path source must explicitly use source_type='path'."
        )
    raw_path = str(value.get("path") or value.get("local_path") or "").strip()
    if not raw_path or "\x00" in raw_path:
        raise ArtifactReferenceError("Local artifact path is incomplete.")
    path = Path(raw_path).expanduser()
    if not path.is_absolute():
        raise ArtifactReferenceError("Local artifact path must be absolute.")
    try:
        resolved = path.resolve(strict=True)
        path_stat = resolved.stat()
    except OSError as exc:
        raise ArtifactReferenceError("Local artifact path could not be opened.") from exc
    if not stat.S_ISREG(path_stat.st_mode) or path.is_symlink():
        raise ArtifactReferenceError("Local artifact path must point to a regular file.")
    if not os.access(resolved, os.R_OK):
        raise ArtifactReferenceError("Local artifact path is not readable.")

    safe_name = sanitize_artifact_name(str(value.get("name") or resolved.name))
    path_digest = hashlib.sha256(str(resolved).encode("utf-8")).hexdigest()[:24]
    return ModelArtifact(
        name=safe_name,
        size_bytes=int(path_stat.st_size),
        format_hint=str(value.get("format") or "").lower() or None,
        reference_id=f"path:{path_digest}",
        storage="local_path",
        stream_factory=lambda: resolved.open("rb"),
        direct_path=resolved,
    )


def resolve_model_artifact(
    value: Any,
    credential_lookup: Callable[[str], Any] | None = None,
    owner_id: Any = None,
) -> ModelArtifact:
    """Resolve a managed, MinIO, or explicitly configured local-path artifact."""

    candidate = _unwrap_artifact_value(value)
    if isinstance(candidate, ModelArtifact):
        return candidate
    if isinstance(candidate, (str, bytes, bytearray, memoryview, os.PathLike)):
        raise ArtifactReferenceError(
            "Use an explicit source_type='path' object for local filesystem scans."
        )
    if isinstance(candidate, Mapping):
        if any(candidate.get(key) not in (None, "") for key in ("url", "bytes", "content")):
            raise ArtifactReferenceError(
                "URLs and raw artifact bytes are not accepted."
            )
        if candidate.get("path") not in (None, "") or candidate.get("local_path") not in (None, ""):
            return _local_path_artifact_from_mapping(candidate)
        storage = _artifact_storage(candidate)
        if storage == "minio":
            return _minio_artifact_from_mapping(candidate, credential_lookup)
        if storage == "managed":
            return _managed_artifact_from_mapping(candidate, owner_id)
        if storage in {"huggingface", "s3", "r2", "gcs"}:
            raise ArtifactReferenceError(
                "Only local managed artifacts and MinIO sources are supported."
            )
    raise ArtifactReferenceError(
        "A KAI-Flow ModelArtifact or validated storage reference is required."
    )


def _coerce_positive_int(value: Any, default: int, maximum: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    if parsed <= 0:
        return default
    return min(parsed, maximum)


def _hash_direct_path(
    path: str,
    deadline: float,
) -> tuple[int, str]:
    size_bytes = 0
    digest = hashlib.sha256()
    try:
        with open(path, "rb") as source:
            while True:
                if time.monotonic() >= deadline:
                    raise ModelArtifactAnalysisTimeoutError("Artifact hashing timed out.")
                chunk = source.read(COPY_CHUNK_BYTES)
                if not chunk:
                    break
                size_bytes += len(chunk)
                digest.update(chunk)
    except OSError as exc:
        raise ArtifactReferenceError("Local artifact could not be read.") from exc
    return size_bytes, digest.hexdigest()


def _is_zip_path(path: str) -> bool:
    try:
        return zipfile.is_zipfile(path)
    except OSError:
        return False


def _safe_archive_member_name(value: Any) -> str | None:
    raw = unicodedata.normalize("NFKC", str(value or "")).replace("\\", "/")
    raw = _CONTROL_CHARS.sub("", raw)
    parts = [part for part in raw.split("/") if part not in {"", "."}]
    if not parts or raw.startswith("/") or any(part == ".." for part in parts):
        return None
    safe_parts = []
    for part in parts:
        cleaned = _SAFE_FILENAME_CHAR.sub("_", part).strip(" ._") or "entry"
        safe_parts.append(cleaned)
    return "/".join(safe_parts)[:MAX_ARCHIVE_MEMBER_NAME]


def _archive_entry_matches(
    name: str, capabilities: Mapping[str, Any]
) -> bool:
    lowered = name.lower()
    extensions = capabilities.get("extensions")
    if isinstance(extensions, Sequence) and not isinstance(extensions, (str, bytes, bytearray)):
        if any(lowered.endswith(str(extension).lower()) for extension in extensions if extension):
            return True
    filenames = capabilities.get("filenames")
    if isinstance(filenames, Sequence) and not isinstance(filenames, (str, bytes, bytearray)):
        return lowered.rsplit("/", 1)[-1] in {
            str(filename).lower() for filename in filenames if filename
        }
    return False


@contextmanager
def stage_model_artifact(
    artifact_value: Any,
    *,
    credential_lookup: Callable[[str], Any] | None = None,
    owner_id: Any = None,
    max_bytes: Any = DEFAULT_MAX_BYTES,
    timeout_seconds: Any = DEFAULT_TIMEOUT_SECONDS,
    prefix: str = "kai-model-security-",
):
    """Resolve an artifact and expose its path without copying local files."""

    artifact = resolve_model_artifact(
        artifact_value,
        credential_lookup=credential_lookup,
        owner_id=owner_id,
    )
    maximum_bytes = _coerce_positive_int(max_bytes, DEFAULT_MAX_BYTES, MAX_MAX_BYTES)
    timeout = _coerce_positive_int(
        timeout_seconds, DEFAULT_TIMEOUT_SECONDS, MAX_TIMEOUT_SECONDS
    )
    if artifact.size_bytes is not None and artifact.size_bytes > maximum_bytes:
        raise ArtifactTooLargeError("Artifact exceeds the configured maximum size.")

    deadline = time.monotonic() + timeout
    artifact_name = sanitize_artifact_name(artifact.name)
    artifact_format = detect_artifact_format(
        artifact_name, format_hint=artifact.format_hint
    )
    if artifact.direct_path:
        size_bytes, sha256 = _hash_direct_path(
            artifact.direct_path,
            deadline,
        )
        if size_bytes > maximum_bytes:
            raise ArtifactTooLargeError("Artifact exceeds the configured maximum size.")
        yield StagedModelArtifact(
            artifact=artifact,
            path=artifact.direct_path,
            name=artifact_name,
            format=artifact_format,
            size_bytes=size_bytes,
            sha256=sha256,
            deadline_monotonic=deadline,
            max_bytes=maximum_bytes,
        )
        return

    temp_dir = tempfile.mkdtemp(prefix=prefix)
    os.chmod(temp_dir, 0o700)
    temp_path = os.path.join(temp_dir, f"{uuid.uuid4().hex}-{artifact_name}")
    size_bytes = 0
    digest = hashlib.sha256()

    try:
        _ensure_staging_disk_space(temp_dir, artifact.size_bytes or 0)
        logger.info(
            "Model artifact staging started: source=%s name=%s expected_bytes=%s",
            artifact.storage,
            artifact_name,
            artifact.size_bytes,
        )
        stream = artifact.open_stream()
        try:
            file_descriptor = os.open(
                temp_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600
            )
            with os.fdopen(file_descriptor, "wb") as destination:
                last_disk_check = 0
                while True:
                    if time.monotonic() >= deadline:
                        raise ModelArtifactAnalysisTimeoutError("Artifact staging timed out.")
                    chunk = stream.read(COPY_CHUNK_BYTES)
                    if not chunk:
                        break
                    if not isinstance(chunk, (bytes, bytearray, memoryview)):
                        raise ArtifactReferenceError(
                            "Artifact stream must yield bytes."
                        )
                    chunk_bytes = bytes(chunk)
                    size_bytes += len(chunk_bytes)
                    if size_bytes > maximum_bytes:
                        raise ArtifactTooLargeError(
                            "Artifact exceeds the configured maximum size."
                        )
                    if size_bytes - last_disk_check >= DISK_CHECK_INTERVAL_BYTES:
                        _ensure_staging_disk_space(temp_dir)
                        last_disk_check = size_bytes
                        percent = (
                            round((size_bytes / artifact.size_bytes) * 100, 1)
                            if artifact.size_bytes
                            else None
                        )
                        logger.info(
                            "Model artifact staging progress: name=%s bytes=%s expected_bytes=%s percent=%s",
                            artifact_name,
                            size_bytes,
                            artifact.size_bytes,
                            percent,
                        )
                    digest.update(chunk_bytes)
                    destination.write(chunk_bytes)
        finally:
            close = getattr(stream, "close", None)
            if callable(close):
                close()

        yield StagedModelArtifact(
            artifact=artifact,
            path=temp_path,
            name=artifact_name,
            format=artifact_format,
            size_bytes=size_bytes,
            sha256=digest.hexdigest(),
            deadline_monotonic=deadline,
            max_bytes=maximum_bytes,
        )
        logger.info(
            "Model artifact staging completed: name=%s size_bytes=%s sha256=%s",
            artifact_name,
            size_bytes,
            digest.hexdigest(),
        )
    finally:
        if temp_dir:
            try:
                shutil.rmtree(temp_dir)
            except OSError:
                logger.error("Security scanner temporary workspace cleanup failed.")
                raise


def parse_scanner_allowlist(value: Any) -> list[str] | None:
    if value in (None, "", []):
        return None
    parsed = value
    if isinstance(value, str):
        stripped = value.strip()
        if stripped.startswith("["):
            try:
                parsed = json.loads(stripped)
            except json.JSONDecodeError as exc:
                raise ValueError(
                    "scanner_allowlist must be a JSON array or comma-separated scanner IDs."
                ) from exc
        else:
            parsed = [item.strip() for item in stripped.split(",") if item.strip()]
    if not isinstance(parsed, Sequence) or isinstance(parsed, (str, bytes, bytearray)):
        raise ValueError("scanner_allowlist must be a list of scanner IDs.")
    scanners: list[str] = []
    for item in parsed:
        scanner = str(item).strip().lower()
        if not _SAFE_SCANNER_ID.fullmatch(scanner):
            raise ValueError("scanner_allowlist contains an invalid scanner ID.")
        if scanner not in scanners:
            scanners.append(scanner)
        if len(scanners) > 32:
            raise ValueError("scanner_allowlist may contain at most 32 scanner IDs.")
    return scanners or None


class ModelArtifactAnalysisService:
    """Shared fail-closed Static model analysis service used by both workflow nodes."""

    def __init__(self, runner: ModelArtifactAnalysisRunner | None = None):
        self._runner = runner or ProcessModelArtifactAnalysisRunner()

    @staticmethod
    def _base_result(
        *,
        scan_id: str,
        scanned_at: str,
        artifact_name: str,
        artifact_format: str,
        size_bytes: int,
        sha256: str,
        decision: str,
        analysis_incomplete: bool,
        scan_outcome: str,
        scanner: str = "none",
        duration_ms: int = 0,
        findings: list[dict[str, Any]] | None = None,
        counts: Mapping[str, int] | None = None,
        checks: int = 0,
        tests: list[dict[str, Any]] | None = None,
        tests_total: int | None = None,
        tests_truncated: bool = False,
        engine_version: str = STATIC_ANALYSIS_VERSION,
    ) -> dict[str, Any]:
        severity_counts = counts or {}
        critical = max(0, int(severity_counts.get("critical", 0)))
        warning = max(0, int(severity_counts.get("warning", 0)))
        info = max(0, int(severity_counts.get("info", 0)))
        result = {
            "schema_version": SCHEMA_VERSION,
            "scan_id": scan_id,
            "scanned_at": scanned_at,
            "artifact": {
                "name": artifact_name,
                "format": artifact_format,
                "size_bytes": max(0, int(size_bytes)),
                "sha256": sha256,
            },
            "decision": decision,
            "should_continue": decision == "allow",
            "analysis_incomplete": bool(analysis_incomplete),
            "scan_outcome": scan_outcome,
            "summary": {
                "critical": critical,
                "warning": warning,
                "info": info,
                "total": critical + warning + info,
                "checks": max(0, int(checks)),
            },
            "findings": deepcopy(findings or []),
            "engine": {
                "name": "Static model analysis",
                "version": engine_version,
                "scanner": scanner,
                "duration_ms": max(0, int(duration_ms)),
            },
        }
        if tests is not None or tests_total is not None:
            result["tests"] = deepcopy(tests or [])
            result["tests_total"] = max(
                len(result["tests"]),
                int(tests_total or 0),
            )
            result["tests_truncated"] = bool(tests_truncated)
        return result

    def _failure_result(
        self,
        *,
        scan_id: str,
        scanned_at: str,
        artifact_name: str,
        artifact_format: str,
        size_bytes: int = 0,
        sha256: str = "",
        decision: str = "error",
    ) -> dict[str, Any]:
        outcome = "inconclusive" if decision == "inconclusive" else "error"
        return self._base_result(
            scan_id=scan_id,
            scanned_at=scanned_at,
            artifact_name=artifact_name,
            artifact_format=artifact_format,
            size_bytes=size_bytes,
            sha256=sha256,
            decision=decision,
            analysis_incomplete=True,
            scan_outcome=outcome,
        )

    def _normalize_engine_result(
        self,
        raw: Mapping[str, Any],
        *,
        scan_id: str,
        scanned_at: str,
        artifact: ModelArtifact,
        size_bytes: int,
        sha256: str,
    ) -> dict[str, Any]:
        raw_metadata = raw.get("metadata")
        metadata: Mapping[str, Any] = (
            raw_metadata if isinstance(raw_metadata, Mapping) else {}
        )
        raw_counts = raw.get("counts")
        counts: Mapping[str, Any] = (
            raw_counts if isinstance(raw_counts, Mapping) else {}
        )
        critical = int(counts.get("critical", 0) or 0)
        warning = int(counts.get("warning", 0) or 0)
        scanner = str(raw.get("scanner") or "unknown").lower()
        checks = max(0, int(raw.get("checks", 0) or 0))
        reported_outcome = str(metadata.get("scan_outcome") or "").lower()
        validated_format = (
            metadata.get("validated_format")
            or metadata.get("format")
            or artifact.format_hint
        )
        artifact_format = detect_artifact_format(
            artifact.name, scanner=scanner, format_hint=validated_format
        )

        coverage_gap = (
            bool(metadata.get("analysis_incomplete"))
            or reported_outcome == "inconclusive"
        )
        coverage_gap = coverage_gap or scanner in {"", "unknown", "skipped", "none"}
        coverage_gap = coverage_gap or checks == 0 or artifact_format == "unknown"
        operational_error = bool(metadata.get("operational_error")) or raw.get(
            "success"
        ) is not True

        if critical > 0:
            decision = "block"
        elif coverage_gap:
            decision = "inconclusive"
        elif warning > 0:
            decision = "review"
        elif operational_error:
            decision = "error"
        else:
            decision = "allow"

        scan_outcome = (
            "complete" if decision in {"allow", "review", "block"} else decision
        )
        findings = raw.get("findings") if isinstance(raw.get("findings"), list) else []
        tests = raw.get("tests") if isinstance(raw.get("tests"), list) else None
        return self._base_result(
            scan_id=scan_id,
            scanned_at=scanned_at,
            artifact_name=sanitize_artifact_name(artifact.name),
            artifact_format=artifact_format,
            size_bytes=size_bytes,
            sha256=sha256,
            decision=decision,
            analysis_incomplete=coverage_gap or decision == "error",
            scan_outcome=scan_outcome,
            scanner=scanner,
            duration_ms=int(raw.get("duration_ms", 0) or 0),
            findings=findings,
            counts=counts,
            checks=checks,
            tests=tests,
            tests_total=raw.get("tests_total") if tests is not None else None,
            tests_truncated=bool(raw.get("tests_truncated", False)),
            engine_version=str(raw.get("engine_version") or STATIC_ANALYSIS_VERSION),
        )

    def _scan_single_staged(
        self,
        staged: StagedModelArtifact,
        *,
        policy_profile: Any = "strict",
        scanner_allowlist: Any = None,
    ) -> dict[str, Any]:
        scan_id = str(uuid.uuid4())
        scanned_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        try:
            profile_name = str(
                policy_profile.get("name", "strict")
                if isinstance(policy_profile, Mapping)
                else policy_profile or "strict"
            ).lower()
            if profile_name not in {"strict", "default"}:
                raise ValueError("Unsupported Static model analysis policy profile.")
            scanners = parse_scanner_allowlist(scanner_allowlist)
            remaining = staged.remaining_seconds()
            scan_config: dict[str, Any] = {
                "cache_scan_results": False,
                "enable_progress": False,
                "max_file_read_size": max(1, staged.size_bytes),
                "max_file_size": max(1, staged.size_bytes),
                "timeout": remaining,
            }
            if scanners:
                scan_config["scanners"] = scanners
            raw = self._runner.run(
                staged.path, scan_config, remaining, staged.name
            )
            result = self._normalize_engine_result(
                raw,
                scan_id=scan_id,
                scanned_at=scanned_at,
                artifact=staged.artifact,
                size_bytes=staged.size_bytes,
                sha256=staged.sha256,
            )
        except Exception as exc:
            logger.error(
                "Static model analysis staged scan failed: scan_id=%s error_type=%s",
                scan_id,
                type(exc).__name__,
            )
            result = self._failure_result(
                scan_id=scan_id,
                scanned_at=scanned_at,
                artifact_name=staged.name,
                artifact_format=staged.format,
                size_bytes=staged.size_bytes,
                sha256=staged.sha256,
                decision="error",
            )
        json.dumps(result, ensure_ascii=False)
        return result

    @staticmethod
    def _archive_file_result(
        result: Mapping[str, Any], entry_name: str, scan_order: int
    ) -> dict[str, Any]:
        artifact = result.get("artifact") if isinstance(result.get("artifact"), Mapping) else {}
        summary = result.get("summary") if isinstance(result.get("summary"), Mapping) else {}
        engine = result.get("engine") if isinstance(result.get("engine"), Mapping) else {}
        findings = deepcopy(
            result.get("findings")[:5]
            if isinstance(result.get("findings"), list)
            else []
        )
        severity_counts = {
            "critical": max(0, int(summary.get("critical", 0) or 0)),
            "warning": max(0, int(summary.get("warning", 0) or 0)),
            "info": max(0, int(summary.get("info", 0) or 0)),
        }
        visible_counts = {"critical": 0, "warning": 0, "info": 0}
        for finding in findings:
            severity = str(finding.get("severity") or "").lower()
            if severity in visible_counts:
                visible_counts[severity] += 1
        for severity in severity_counts:
            severity_counts[severity] = max(
                severity_counts[severity],
                visible_counts[severity],
            )
        tests = deepcopy(
            result.get("tests")
            if isinstance(result.get("tests"), list)
            else []
        )
        tests_total = max(
            len(tests),
            int(result.get("tests_total", 0) or 0),
        )
        normalized_summary = {
            "critical": severity_counts["critical"],
            "warning": severity_counts["warning"],
            "info": severity_counts["info"],
            "total": max(
                max(0, int(summary.get("total", 0) or 0)),
                sum(severity_counts.values()),
            ),
            "checks": max(0, int(summary.get("checks", 0) or 0)),
        }
        normalized_summary["checks"] = max(
            normalized_summary["checks"],
            len(tests),
        )
        item = {
            "scan_order": max(1, int(scan_order)),
            "path": entry_name,
            "name": str(artifact.get("name") or entry_name),
            "format": str(artifact.get("format") or "unknown"),
            "size_bytes": max(0, int(artifact.get("size_bytes", 0) or 0)),
            "sha256": str(artifact.get("sha256") or ""),
            "decision": str(result.get("decision") or "error"),
            "scan_outcome": str(result.get("scan_outcome") or "error"),
            "analysis_incomplete": bool(result.get("analysis_incomplete")),
            "summary": normalized_summary,
            "tests": tests,
            "tests_total": tests_total,
            "tests_truncated": bool(result.get("tests_truncated"))
            or tests_total > len(tests),
            "findings": findings,
            "engine": {
                "name": str(engine.get("name") or "Static model analysis"),
                "version": str(engine.get("version") or "unknown"),
                "scanner": str(engine.get("scanner") or "unknown"),
                "duration_ms": max(0, int(engine.get("duration_ms", 0) or 0)),
            },
        }
        return item

    def _scan_zip_staged(
        self,
        staged: StagedModelArtifact,
        *,
        policy_profile: Any,
        scanner_allowlist: Any,
        archive_depth: int,
    ) -> dict[str, Any]:
        started = time.monotonic()
        scan_id = str(uuid.uuid4())
        scanned_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        capabilities = get_static_analysis_capabilities()
        entry_results: list[dict[str, Any]] = []
        skipped_files: list[str] = []
        temp_dir: str | None = None
        limit_reached = False
        expanded_bytes = 0
        archive_max_bytes = max(1, min(int(staged.max_bytes), MAX_MAX_BYTES))

        try:
            with zipfile.ZipFile(staged.path) as archive:
                infos = archive.infolist()
                limit_reached = len(infos) > MAX_ARCHIVE_ENTRIES
                temp_dir = tempfile.mkdtemp(prefix="kai-static_analysis-zip-entry-")
                os.chmod(temp_dir, 0o700)
                for index, info in enumerate(infos[:MAX_ARCHIVE_ENTRIES]):
                    if info.is_dir():
                        continue
                    entry_name = _safe_archive_member_name(info.filename)
                    if not entry_name:
                        skipped_files.append("<unsafe archive entry>")
                        continue
                    if not _archive_entry_matches(entry_name, capabilities):
                        skipped_files.append(entry_name)
                        continue

                    scan_order = len(entry_results) + 1

                    declared_size = int(info.file_size)
                    if declared_size < 0 or declared_size > archive_max_bytes:
                        entry_results.append(
                            self._archive_file_result(
                                self._failure_result(
                                    scan_id=str(uuid.uuid4()),
                                    scanned_at=scanned_at,
                                    artifact_name=entry_name,
                                    artifact_format=detect_artifact_format(entry_name),
                                    size_bytes=max(0, declared_size),
                                    decision="inconclusive",
                                ),
                                entry_name,
                                scan_order,
                            )
                        )
                        continue
                    if expanded_bytes + declared_size > archive_max_bytes:
                        limit_reached = True
                        skipped_files.append(
                            f"<archive expansion limit: {entry_name}>"
                        )
                        break
                    if time.monotonic() >= staged.deadline_monotonic:
                        limit_reached = True
                        break

                    _ensure_staging_disk_space(temp_dir, declared_size)
                    entry_path = Path(temp_dir) / (
                        f"{index}-{sanitize_artifact_name(Path(entry_name).name)}"
                    )
                    entry_size = 0
                    entry_digest = hashlib.sha256()
                    try:
                        with archive.open(info, "r") as source, entry_path.open("xb") as destination:
                            while True:
                                if time.monotonic() >= staged.deadline_monotonic:
                                    raise ModelArtifactAnalysisTimeoutError("Archive entry extraction timed out.")
                                chunk = source.read(COPY_CHUNK_BYTES)
                                if not chunk:
                                    break
                                entry_size += len(chunk)
                                if entry_size > archive_max_bytes:
                                    raise ArtifactTooLargeError(
                                        "Archive entry exceeds the configured maximum size."
                                    )
                                entry_digest.update(chunk)
                                destination.write(chunk)
                        if entry_size != declared_size:
                            raise ArtifactReferenceError("Archive entry size validation failed.")
                        expanded_bytes += entry_size
                        entry_artifact = ModelArtifact(
                            name=entry_name,
                            size_bytes=entry_size,
                            format_hint=None,
                            storage="archive_entry",
                            stream_factory=lambda path=entry_path: path.open("rb"),
                            direct_path=entry_path,
                        )
                        entry_staged = StagedModelArtifact(
                            artifact=entry_artifact,
                            path=str(entry_path),
                            name=sanitize_artifact_name(entry_name),
                            format=detect_artifact_format(entry_name),
                            size_bytes=entry_size,
                            sha256=entry_digest.hexdigest(),
                            deadline_monotonic=staged.deadline_monotonic,
                            max_bytes=archive_max_bytes,
                        )
                        entry_result = self.scan_staged(
                            entry_staged,
                            policy_profile=policy_profile,
                            scanner_allowlist=scanner_allowlist,
                            archive_depth=archive_depth + 1,
                        )
                    except Exception as exc:
                        logger.error(
                            "Static model analysis archive entry failed: entry=%s error_type=%s",
                            entry_name,
                            type(exc).__name__,
                        )
                        entry_result = self._failure_result(
                            scan_id=str(uuid.uuid4()),
                            scanned_at=scanned_at,
                            artifact_name=entry_name,
                            artifact_format=detect_artifact_format(entry_name),
                            size_bytes=entry_size,
                            sha256=entry_digest.hexdigest(),
                            decision="error",
                        )
                    entry_results.append(
                        self._archive_file_result(
                            entry_result,
                            entry_name,
                            scan_order,
                        )
                    )

                if len(infos) > MAX_ARCHIVE_ENTRIES:
                    skipped_files.append(
                        f"<archive entry limit: {len(infos) - MAX_ARCHIVE_ENTRIES} more>"
                    )
        except (OSError, zipfile.BadZipFile) as exc:
            logger.error(
                "Static model analysis ZIP scan failed: scan_id=%s error_type=%s",
                scan_id,
                type(exc).__name__,
            )
            result = self._failure_result(
                scan_id=scan_id,
                scanned_at=scanned_at,
                artifact_name=staged.name,
                artifact_format="archive",
                size_bytes=staged.size_bytes,
                sha256=staged.sha256,
                decision="error",
            )
            result["archive"] = {
                "files_scanned": 0,
                "files_skipped": 0,
                "supported_extensions": capabilities.get("extensions", []),
                "error": "Archive could not be read.",
            }
            return result
        finally:
            if temp_dir:
                shutil.rmtree(temp_dir, ignore_errors=True)

        counts = {"critical": 0, "warning": 0, "info": 0}
        checks = 0
        findings: list[dict[str, Any]] = []
        decisions = []
        for file_result in entry_results:
            decisions.append(str(file_result.get("decision") or "error"))
            summary = file_result.get("summary") or {}
            for severity in counts:
                counts[severity] += max(0, int(summary.get(severity, 0) or 0))
            checks += max(0, int(summary.get("checks", 0) or 0))
            for finding in file_result.get("findings", [])[:MAX_ENGINE_FINDINGS]:
                finding_copy = deepcopy(finding)
                finding_copy.setdefault("file", file_result["path"])
                findings.append(finding_copy)

        if not entry_results:
            decision = "inconclusive"
        elif "block" in decisions:
            decision = "block"
        elif limit_reached:
            decision = "inconclusive"
        elif "error" in decisions:
            decision = "error"
        elif "inconclusive" in decisions:
            decision = "inconclusive"
        elif "review" in decisions:
            decision = "review"
        else:
            decision = "allow"
        findings.sort(
            key=lambda item: {"critical": 0, "warning": 1, "info": 2}.get(
                str(item.get("severity")), 3
            )
        )
        result = self._base_result(
            scan_id=scan_id,
            scanned_at=scanned_at,
            artifact_name=staged.name,
            artifact_format="archive",
            size_bytes=staged.size_bytes,
            sha256=staged.sha256,
            decision=decision,
            analysis_incomplete=limit_reached or decision in {"inconclusive", "error"},
            scan_outcome=(
                "complete" if decision in {"allow", "review", "block"} else decision
            ),
            scanner="zip",
            duration_ms=int((time.monotonic() - started) * 1000),
            findings=findings[:MAX_ENGINE_FINDINGS],
            counts=counts,
            checks=checks,
            engine_version=str(capabilities.get("version") or STATIC_ANALYSIS_VERSION),
        )
        result["files"] = entry_results
        result["archive"] = {
            "files_scanned": len(entry_results),
            "files_skipped": len(skipped_files),
            "skipped": skipped_files[:128],
            "supported_extensions": capabilities.get("extensions", []),
            "scanner_version": capabilities.get("version") or STATIC_ANALYSIS_VERSION,
            "entry_limit_reached": limit_reached,
        }
        result["total_evaluation"] = {
            "decision": decision,
            "should_continue": decision == "allow",
            "scan_outcome": (
                "complete" if decision in {"allow", "review", "block"} else decision
            ),
            "analysis_incomplete": limit_reached
            or decision in {"inconclusive", "error"},
            "tests_truncated": any(
                bool(file_result.get("tests_truncated"))
                for file_result in entry_results
            ),
            "summary": {
                **counts,
                "total": sum(counts.values()),
                "checks": checks,
                "tests_total": sum(
                    max(0, int(file_result.get("tests_total", 0) or 0))
                    for file_result in entry_results
                ),
            },
            "findings": deepcopy(findings[:MAX_ENGINE_FINDINGS]),
            "files_scanned": len(entry_results),
            "files_skipped": len(skipped_files),
        }
        json.dumps(result, ensure_ascii=False)
        return result

    def scan_staged(
        self,
        staged: StagedModelArtifact,
        *,
        policy_profile: Any = "strict",
        scanner_allowlist: Any = None,
        archive_depth: int = 0,
    ) -> dict[str, Any]:
        """Scan a path directly, expanding ZIP files into one bounded JSON result."""

        is_zip = _is_zip_path(staged.path)
        if is_zip and archive_depth >= MAX_ARCHIVE_DEPTH:
            result = self._failure_result(
                scan_id=str(uuid.uuid4()),
                scanned_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                artifact_name=staged.name,
                artifact_format="archive",
                size_bytes=staged.size_bytes,
                sha256=staged.sha256,
                decision="inconclusive",
            )
            result["archive"] = {
                "files_scanned": 0,
                "files_skipped": 0,
                "supported_extensions": get_static_analysis_capabilities().get(
                    "extensions", []
                ),
                "scanner_version": installed_static_analysis_version(),
                "error": "Nested archive depth limit was reached.",
            }
            return result
        if is_zip:
            return self._scan_zip_staged(
                staged,
                policy_profile=policy_profile,
                scanner_allowlist=scanner_allowlist,
                archive_depth=archive_depth,
            )
        return self._scan_single_staged(
            staged,
            policy_profile=policy_profile,
            scanner_allowlist=scanner_allowlist,
        )

    def scan(
        self,
        artifact_value: Any,
        *,
        credential_lookup: Callable[[str], Any] | None = None,
        owner_id: Any = None,
        policy_profile: Any = "strict",
        scanner_allowlist: Any = None,
        max_bytes: Any = DEFAULT_MAX_BYTES,
        timeout_seconds: Any = DEFAULT_TIMEOUT_SECONDS,
    ) -> dict[str, Any]:
        """Resolve and scan an artifact directly, staging only stream-only sources."""

        scan_id = str(uuid.uuid4())
        scanned_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        result: dict[str, Any] | None = None
        artifact_name = "artifact.bin"
        artifact_format = "unknown"
        size_bytes = 0
        sha256 = ""

        try:
            artifact = resolve_model_artifact(
                artifact_value,
                credential_lookup=credential_lookup,
                owner_id=owner_id,
            )
            artifact_name = sanitize_artifact_name(artifact.name)
            artifact_format = detect_artifact_format(
                artifact_name, format_hint=artifact.format_hint
            )
            profile_name = str(
                policy_profile.get("name", "strict")
                if isinstance(policy_profile, Mapping)
                else policy_profile or "strict"
            ).lower()
            if profile_name not in {"strict", "default"}:
                raise ValueError("Unsupported Static model analysis policy profile.")

            maximum_bytes = _coerce_positive_int(
                max_bytes, DEFAULT_MAX_BYTES, MAX_MAX_BYTES
            )
            timeout = _coerce_positive_int(
                timeout_seconds, DEFAULT_TIMEOUT_SECONDS, MAX_TIMEOUT_SECONDS
            )
            if artifact.size_bytes is not None and artifact.size_bytes > maximum_bytes:
                result = self._failure_result(
                    scan_id=scan_id,
                    scanned_at=scanned_at,
                    artifact_name=artifact_name,
                    artifact_format=artifact_format,
                    size_bytes=artifact.size_bytes,
                    decision="inconclusive",
                )
            else:
                with stage_model_artifact(
                    artifact,
                    credential_lookup=credential_lookup,
                    owner_id=owner_id,
                    max_bytes=maximum_bytes,
                    timeout_seconds=timeout,
                    prefix="kai-static_analysis-",
                ) as staged:
                    result = self.scan_staged(
                        staged,
                        policy_profile=profile_name,
                        scanner_allowlist=scanner_allowlist,
                    )
                    size_bytes = staged.size_bytes
                    sha256 = staged.sha256
        except ArtifactTooLargeError:
            result = self._failure_result(
                scan_id=scan_id,
                scanned_at=scanned_at,
                artifact_name=artifact_name,
                artifact_format=artifact_format,
                size_bytes=size_bytes,
                sha256=sha256,
                decision="inconclusive",
            )
        except ArtifactDiskSpaceError:
            result = self._failure_result(
                scan_id=scan_id,
                scanned_at=scanned_at,
                artifact_name=artifact_name,
                artifact_format=artifact_format,
                size_bytes=size_bytes,
                sha256=sha256,
                decision="error",
            )
        except Exception as exc:
            logger.error(
                "Static model analysis scan failed: scan_id=%s error_type=%s",
                scan_id,
                type(exc).__name__,
            )
            result = self._failure_result(
                scan_id=scan_id,
                scanned_at=scanned_at,
                artifact_name=artifact_name,
                artifact_format=artifact_format,
                size_bytes=size_bytes,
                sha256=sha256,
                decision="error",
            )
        assert result is not None
        json.dumps(result, ensure_ascii=False)
        logger.info(
            "Static model analysis scan completed: scan_id=%s decision=%s size_bytes=%d",
            scan_id,
            result["decision"],
            result["artifact"]["size_bytes"],
        )
        return result

model_artifact_analysis_service = ModelArtifactAnalysisService()


__all__ = [
    "ArtifactDiskSpaceError",
    "DEFAULT_MAX_BYTES",
    "DEFAULT_TIMEOUT_SECONDS",
    "InProcessModelArtifactAnalysisRunner",
    "STATIC_ANALYSIS_VERSION",
    "ModelArtifact",
    "ModelArtifactAnalysisRunnerError",
    "ModelArtifactAnalysisService",
    "ModelArtifactAnalysisTimeoutError",
    "StagedModelArtifact",
    "detect_artifact_format",
    "get_static_analysis_capabilities",
    "installed_static_analysis_version",
    "model_artifact_analysis_service",
    "resolve_model_artifact",
    "sanitize_artifact_name",
    "stage_model_artifact",
]
