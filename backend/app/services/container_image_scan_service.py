"""Bounded Container image scan adapter for model-serving container images."""

from __future__ import annotations

import json
import logging
import os
import re
import shutil
import stat
import tempfile
import time
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any, Protocol

from app.services.security_audit_service import make_layer_result
from app.services.security_command_runner import (
    SecurityCommandResult,
    SecurityCommandTimeoutError,
    SecurityCommandUnavailableError,
    resolve_security_binary,
    run_security_command,
)


logger = logging.getLogger(__name__)

IMAGE_SCAN_ENGINE_VERSION = "0.73.0"
DEFAULT_IMAGE_SCAN_TIMEOUT_SECONDS = 300
MAX_IMAGE_SCAN_TIMEOUT_SECONDS = 1800
MAX_IMAGE_SCAN_REPORT_BYTES = 16 * 1024 * 1024
MAX_IMAGE_SCAN_FINDINGS = 50
_SAFE_IMAGE_REFERENCE = re.compile(
    r"^(?:[a-zA-Z0-9.-]+(?::[0-9]{1,5})?/)?"
    r"(?:[a-z0-9][a-z0-9._-]*/)*"
    r"[a-z0-9][a-z0-9._-]*"
    r"(?::[A-Za-z0-9_][A-Za-z0-9._-]{0,127}|@sha256:[a-fA-F0-9]{64})?$"
)
_VALID_SCANNERS = {"vuln", "secret", "misconfig", "license"}
_VALID_SEVERITIES = {"UNKNOWN", "LOW", "MEDIUM", "HIGH", "CRITICAL"}
_IMAGE_ARTIFACT_DIGEST = re.compile(r"^sha256:([a-fA-F0-9]{64})$")


class ContainerImageScanRunner(Protocol):
    def scan_image(
        self,
        image_ref: str,
        *,
        scanners: Sequence[str],
        severities: Sequence[str],
        ignore_unfixed: bool,
        skip_db_update: bool,
        timeout_seconds: int,
    ) -> dict[str, Any]:
        """Scan one OCI image and return native JSON plus bounded metadata."""


def validate_image_reference(value: Any) -> str:
    image_ref = str(value or "").strip()
    path_segments = image_ref.split("/")
    if (
        not image_ref
        or len(image_ref) > 512
        or "://" in image_ref
        or image_ref.startswith((".", "-", "_", "/"))
        or any(segment in {"", ".", ".."} for segment in path_segments)
        or any(character.isspace() or ord(character) < 32 for character in image_ref)
        or not _SAFE_IMAGE_REFERENCE.fullmatch(image_ref)
    ):
        raise ValueError("A valid OCI image reference is required.")
    return image_ref


def _parse_choice_list(
    value: Any, *, allowed: set[str], default: Sequence[str], uppercase: bool = False
) -> list[str]:
    parsed = value
    if value in (None, "", []):
        parsed = list(default)
    elif isinstance(value, str):
        stripped = value.strip()
        if stripped.startswith("["):
            try:
                parsed = json.loads(stripped)
            except json.JSONDecodeError as exc:
                raise ValueError("Scanner options must be a JSON array or comma-separated list.") from exc
        else:
            parsed = [item.strip() for item in stripped.split(",") if item.strip()]
    if not isinstance(parsed, Sequence) or isinstance(parsed, (str, bytes, bytearray)):
        raise ValueError("Scanner options must be a list.")
    result: list[str] = []
    for item in parsed:
        choice = str(item).strip()
        choice = choice.upper() if uppercase else choice.lower()
        if choice not in allowed:
            raise ValueError(f"Unsupported Container image scan option: {choice}")
        if choice not in result:
            result.append(choice)
    if not result:
        raise ValueError("At least one Container image scan option is required.")
    return result


def parse_image_scan_scanners(value: Any) -> list[str]:
    return _parse_choice_list(
        value,
        allowed=_VALID_SCANNERS,
        default=("vuln", "secret", "misconfig", "license"),
    )


def parse_image_scan_severities(value: Any) -> list[str]:
    return _parse_choice_list(
        value,
        allowed=_VALID_SEVERITIES,
        default=("UNKNOWN", "LOW", "MEDIUM", "HIGH", "CRITICAL"),
        uppercase=True,
    )


def _positive_timeout(value: Any) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return DEFAULT_IMAGE_SCAN_TIMEOUT_SECONDS
    if parsed <= 0:
        return DEFAULT_IMAGE_SCAN_TIMEOUT_SECONDS
    return min(parsed, MAX_IMAGE_SCAN_TIMEOUT_SECONDS)


def _as_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "on"}:
            return True
        if normalized in {"false", "0", "no", "off", ""}:
            return False
        return default
    if isinstance(value, (int, float)):
        return value != 0
    return default


class CliContainerImageScanRunner:
    def __init__(self, binary: str | None = None):
        self._binary = binary

    def _resolved_binary(self) -> str:
        if self._binary:
            return resolve_security_binary(self._binary, "KAI_IMAGE_SCAN_BINARY")
        return resolve_security_binary("trivy", "KAI_IMAGE_SCAN_BINARY")

    def scan_image(
        self,
        image_ref: str,
        *,
        scanners: Sequence[str],
        severities: Sequence[str],
        ignore_unfixed: bool,
        skip_db_update: bool,
        timeout_seconds: int,
    ) -> dict[str, Any]:
        binary = self._resolved_binary()
        temp_dir = tempfile.mkdtemp(prefix="kai-container_image_scan-")
        os.chmod(temp_dir, 0o700)
        report_path = Path(temp_dir) / "report.json"
        try:
            args = [
                binary,
                "image",
                "--format",
                "json",
                "--output",
                str(report_path),
                "--quiet",
                "--no-progress",
                "--disable-telemetry",
                "--skip-version-check",
                "--image-src",
                "remote",
                "--scanners",
                ",".join(scanners),
                "--severity",
                ",".join(severities),
                "--timeout",
                f"{timeout_seconds}s",
            ]
            image_config_scanners = [
                scanner for scanner in scanners if scanner in {"misconfig", "secret"}
            ]
            if image_config_scanners:
                args.extend(
                    ["--image-config-scanners", ",".join(image_config_scanners)]
                )
            if ignore_unfixed:
                args.append("--ignore-unfixed")
            if skip_db_update:
                args.extend(
                    [
                        "--skip-db-update",
                        "--skip-java-db-update",
                        "--skip-check-update",
                    ]
                )
            args.append(image_ref)
            command_result: SecurityCommandResult = run_security_command(
                args, timeout_seconds=timeout_seconds
            )
            if command_result.returncode != 0:
                return {
                    "success": False,
                    "returncode": command_result.returncode,
                    "duration_ms": command_result.duration_ms,
                    "engine_version": IMAGE_SCAN_ENGINE_VERSION,
                }
            try:
                report_stat = report_path.stat()
            except OSError as exc:
                raise RuntimeError("Container image scan did not create a report.") from exc
            if (
                not stat.S_ISREG(report_stat.st_mode)
                or report_path.is_symlink()
                or report_stat.st_size > MAX_IMAGE_SCAN_REPORT_BYTES
            ):
                raise RuntimeError("Container image scan report is missing, invalid, or too large.")
            report = json.loads(report_path.read_text(encoding="utf-8"))
            if not isinstance(report, Mapping):
                raise RuntimeError("Container image scan returned an invalid report contract.")
            return {
                "success": True,
                "report": report,
                "duration_ms": command_result.duration_ms,
                "engine_version": IMAGE_SCAN_ENGINE_VERSION,
            }
        finally:
            try:
                shutil.rmtree(temp_dir)
            except OSError:
                logger.error("Container image scan temporary report cleanup failed.")
                raise


def _safe_text(value: Any, limit: int = 320) -> str:
    return " ".join(str(value or "").replace("\x00", "").split())[:limit]


def _normalized_severity(value: Any, *, category: str = "") -> str:
    normalized = str(value or "UNKNOWN").upper()
    if category == "license" and normalized in {"FORBIDDEN", "CRITICAL"}:
        return "critical"
    if normalized == "CRITICAL":
        return "critical"
    if normalized in {"HIGH", "MEDIUM", "RESTRICTED", "RECIPROCAL", "UNKNOWN"}:
        return "warning"
    return "info"


def _normalize_image_scan_report(report: Mapping[str, Any]) -> dict[str, Any]:
    finding_buckets: dict[str, list[dict[str, Any]]] = {
        "critical": [],
        "warning": [],
        "info": [],
    }
    counts = {"critical": 0, "warning": 0, "info": 0}
    category_counts = {"vulnerability": 0, "secret": 0, "misconfiguration": 0, "license": 0}
    checks = 0
    analysis_incomplete = False

    def retain(finding: dict[str, Any]) -> None:
        severity = str(finding.get("severity") or "info")
        if severity not in finding_buckets:
            severity = "info"
            finding["severity"] = severity
        counts[severity] += 1
        if len(finding_buckets[severity]) < MAX_IMAGE_SCAN_FINDINGS:
            finding_buckets[severity].append(finding)

    def bounded_items(value: Any, limit: int) -> list[Any]:
        nonlocal analysis_incomplete
        if value is None:
            return []
        if not isinstance(value, list):
            analysis_incomplete = True
            return []
        if len(value) > limit:
            analysis_incomplete = True
        return value[:limit]

    for result in bounded_items(report.get("Results"), 256):
        if not isinstance(result, Mapping):
            analysis_incomplete = True
            continue
        location = _safe_text(result.get("Target"), 192)
        for item in bounded_items(result.get("Vulnerabilities"), 1000):
            if not isinstance(item, Mapping):
                analysis_incomplete = True
                continue
            checks += 1
            category_counts["vulnerability"] += 1
            retain(
                {
                    "severity": _normalized_severity(item.get("Severity")),
                    "title": _safe_text(
                        item.get("Title") or item.get("VulnerabilityID") or "Package vulnerability",
                        160,
                    ),
                    "message": _safe_text(
                        f"{item.get('PkgName', 'package')} {item.get('InstalledVersion', '')}: "
                        f"{item.get('Description') or item.get('Title') or ''}"
                    ),
                    "rule_code": _safe_text(item.get("VulnerabilityID"), 96),
                    "category": "vulnerability",
                    "location": location,
                    "fixed_version": _safe_text(item.get("FixedVersion"), 96),
                }
            )
        for item in bounded_items(result.get("Secrets"), 1000):
            if not isinstance(item, Mapping):
                analysis_incomplete = True
                continue
            checks += 1
            category_counts["secret"] += 1
            retain(
                {
                    "severity": _normalized_severity(item.get("Severity")),
                    "title": _safe_text(item.get("Title") or "Exposed secret", 160),
                    "message": "A credential-like value was detected. The matched secret is intentionally redacted.",
                    "rule_code": _safe_text(item.get("RuleID"), 96),
                    "category": "secret",
                    "location": _safe_text(item.get("File") or location, 192),
                    "remediation": "Revoke the credential, remove it from the image, and rebuild from a clean source.",
                }
            )
        for item in bounded_items(result.get("Misconfigurations"), 1000):
            if not isinstance(item, Mapping):
                analysis_incomplete = True
                continue
            checks += 1
            category_counts["misconfiguration"] += 1
            retain(
                {
                    "severity": _normalized_severity(item.get("Severity")),
                    "title": _safe_text(item.get("Title") or "Runtime misconfiguration", 160),
                    "message": _safe_text(item.get("Message") or item.get("Description")),
                    "rule_code": _safe_text(item.get("ID") or item.get("AVDID"), 96),
                    "category": "misconfiguration",
                    "location": location,
                    "remediation": _safe_text(item.get("Resolution")),
                }
            )
        for item in bounded_items(result.get("Licenses"), 1000):
            if not isinstance(item, Mapping):
                analysis_incomplete = True
                continue
            checks += 1
            category_counts["license"] += 1
            classification = str(item.get("Category") or item.get("Severity") or "UNKNOWN")
            retain(
                {
                    "severity": _normalized_severity(classification, category="license"),
                    "title": _safe_text(item.get("Name") or "Software license", 160),
                    "message": _safe_text(
                        f"{item.get('PkgName', 'package')} uses a {classification} license."
                    ),
                    "rule_code": _safe_text(item.get("Name") or "license", 96),
                    "category": "license",
                    "location": location,
                }
            )

    findings = (
        finding_buckets["critical"]
        + finding_buckets["warning"]
        + finding_buckets["info"]
    )
    return {
        "findings": findings[:MAX_IMAGE_SCAN_FINDINGS],
        "findings_total": sum(counts.values()),
        "counts": counts,
        "checks": checks,
        "category_counts": category_counts,
        "analysis_incomplete": analysis_incomplete,
    }


class ContainerImageScanService:
    def __init__(self, runner: ContainerImageScanRunner | None = None):
        self._runner = runner or CliContainerImageScanRunner()

    def scan_image(
        self,
        image_ref: Any,
        *,
        scanners: Any = None,
        severities: Any = None,
        ignore_unfixed: Any = False,
        skip_db_update: Any = False,
        timeout_seconds: Any = DEFAULT_IMAGE_SCAN_TIMEOUT_SECONDS,
    ) -> dict[str, Any]:
        started = time.monotonic()
        target: dict[str, Any] = {"kind": "oci_image"}
        try:
            normalized_ref = validate_image_reference(image_ref)
            target["reference"] = normalized_ref
            scanner_list = parse_image_scan_scanners(scanners)
            severity_list = parse_image_scan_severities(severities)
            timeout = _positive_timeout(timeout_seconds)
            raw = self._runner.scan_image(
                normalized_ref,
                scanners=scanner_list,
                severities=severity_list,
                ignore_unfixed=_as_bool(ignore_unfixed),
                skip_db_update=_as_bool(skip_db_update),
                timeout_seconds=timeout,
            )
            if raw.get("success") is not True:
                raise RuntimeError("Container image scan image scan failed.")
            report = raw.get("report")
            if not isinstance(report, Mapping):
                raise RuntimeError("Container image scan returned an invalid report.")
            artifact_digest = _safe_text(report.get("ArtifactID"), 96)
            digest_match = _IMAGE_ARTIFACT_DIGEST.fullmatch(artifact_digest)
            if digest_match:
                target["sha256"] = digest_match.group(1).lower()
            normalized = _normalize_image_scan_report(report)
            counts = normalized["counts"]
            if counts["critical"] > 0:
                decision = "block"
            elif normalized["analysis_incomplete"]:
                decision = "inconclusive"
            elif counts["warning"] > 0:
                decision = "review"
            else:
                decision = "allow"
            status = (
                "inconclusive" if normalized["analysis_incomplete"] else "complete"
            )
            result = make_layer_result(
                layer_id="container_image_scan",
                engine_name="Container image scan",
                engine_version=str(raw.get("engine_version") or IMAGE_SCAN_ENGINE_VERSION),
                decision=decision,
                status=status,
                target=target,
                counts=counts,
                checks=normalized["checks"],
                findings=normalized["findings"],
                duration_ms=raw.get("duration_ms", 0),
                coverage_complete=not normalized["analysis_incomplete"],
                reason_codes=(
                    ["report_truncated"]
                    if normalized["analysis_incomplete"]
                    else []
                ),
            )
            result["evidence"] = {
                "scanners": scanner_list,
                "severities": severity_list,
                "category_counts": normalized["category_counts"],
                "findings_total": normalized["findings_total"],
                "image_digest": artifact_digest if digest_match else "",
            }
            json.dumps(result, ensure_ascii=False)
            return result
        except SecurityCommandTimeoutError:
            status = "timeout"
            reason = "timeout"
        except SecurityCommandUnavailableError:
            status = "error"
            reason = "engine_unavailable"
        except Exception as exc:
            logger.error("Container image scan failed: error_type=%s", type(exc).__name__)
            status = "error"
            reason = "scan_error"
        return make_layer_result(
            layer_id="container_image_scan",
            engine_name="Container image scan",
            engine_version=IMAGE_SCAN_ENGINE_VERSION,
            decision="error",
            status=status,
            target=target,
            duration_ms=int((time.monotonic() - started) * 1000),
            coverage_complete=False,
            reason_codes=[reason],
        )


container_image_scan_service = ContainerImageScanService()


__all__ = [
    "CliContainerImageScanRunner",
    "IMAGE_SCAN_ENGINE_VERSION",
    "ContainerImageScanService",
    "parse_image_scan_scanners",
    "parse_image_scan_severities",
    "container_image_scan_service",
    "validate_image_reference",
]
