"""Shared, bounded contracts for layered model-security controls.

The individual scanners intentionally keep their native reports behind their
service boundary.  Workflow state receives only the normalized layer envelope
defined here, and the policy gate combines those envelopes deterministically.
"""

from __future__ import annotations

import json
import re
import time
import uuid
from collections.abc import Mapping, Sequence
from copy import deepcopy
from itertools import islice
from typing import Any

from app.services.model_security_error_catalog import enrich_security_finding


LAYER_SCHEMA_VERSION = "kai.security.layer.v1"
AUDIT_SCHEMA_VERSION = "kai.security.audit.v1"
POLICY_VERSION = "1"
MAX_LAYER_FINDINGS = 20
MAX_AUDIT_FINDINGS = 5
MAX_AUDIT_LAYER_FINDINGS = 5
MAX_PUBLIC_LAYER_FINDINGS = 3
MAX_FINDING_CANDIDATES = 1000
MAX_ARCHIVE_TESTS = 512
MAX_TEXT = 320

_SAFE_LAYER_ID = re.compile(r"^[a-z][a-z0-9_-]{0,63}$")
_VALID_DECISIONS = {"allow", "review", "block", "inconclusive", "error"}
_VALID_STATUSES = {
    "complete",
    "not_applicable",
    "unsupported",
    "timeout",
    "inconclusive",
    "error",
}
_SEVERITY_ORDER = {"critical": 0, "warning": 1, "info": 2}
_LAYER_LABELS = {
    "static_analysis": "Static model analysis",
    "pickle_security": "Pickle security analysis",
    "artifact_provenance": "Artifact provenance",
    "container_image_scan": "Container image scan",
}


def _safe_text(value: Any, limit: int = MAX_TEXT) -> str:
    text = " ".join(str(value or "").replace("\x00", "").split())
    return text[:limit]


def _positive_int(value: Any) -> int:
    try:
        return max(0, int(value or 0))
    except (TypeError, ValueError):
        return 0


def _safe_bool(value: Any, default: bool = False) -> bool:
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


def _severity(value: Any) -> str:
    normalized = str(getattr(value, "name", value) or "info").lower()
    if normalized in {"critical", "high", "overtly_malicious", "likely_overtly_malicious"}:
        return "critical"
    if normalized in {
        "warning",
        "medium",
        "suspicious",
        "likely_unsafe",
        "possibly_unsafe",
    }:
        return "warning"
    return "info"


def _bounded_findings(
    findings: Any,
    limit: int = MAX_LAYER_FINDINGS,
    *,
    layer_id: str | None = None,
) -> list[dict[str, Any]]:
    if not isinstance(findings, Sequence) or isinstance(findings, (str, bytes, bytearray)):
        return []
    bounded: list[dict[str, Any]] = []
    for raw in islice(findings, MAX_FINDING_CANDIDATES):
        item = raw if isinstance(raw, Mapping) else {"message": raw}
        finding: dict[str, Any] = {
            "severity": _severity(item.get("severity")),
            "title": _safe_text(item.get("title") or item.get("type") or "Security finding", 160),
            "message": _safe_text(item.get("message") or item.get("description") or ""),
        }
        for source_key, target_key, field_limit in (
            ("rule_code", "rule_code", 96),
            ("rule_description", "rule_description", MAX_TEXT),
            ("rule_solution", "rule_solution", MAX_TEXT),
            ("risk_level", "risk_level", 32),
            ("rule_id", "rule_code", 96),
            ("category", "category", 96),
            ("location", "location", 192),
            ("remediation", "remediation", MAX_TEXT),
            ("fixed_version", "fixed_version", 96),
        ):
            if item.get(source_key) not in (None, ""):
                finding[target_key] = _safe_text(item[source_key], field_limit)
        finding_layer_id = str(layer_id or item.get("layer_id") or "").strip().lower()
        scanner_rule_code = item.get("rule_code")
        if finding_layer_id in {"static_analysis", "pickle_security"} and scanner_rule_code:
            finding.update(
                enrich_security_finding(
                    finding_layer_id,
                    scanner_rule_code,
                    severity=item.get("severity"),
                    message=finding.get("message"),
                )
            )
        bounded.append(finding)
    bounded.sort(key=lambda item: _SEVERITY_ORDER.get(str(item.get("severity")), 3))
    return bounded[: max(0, limit)]


def _bounded_tests(tests: Any) -> list[dict[str, Any]]:
    if not isinstance(tests, Sequence) or isinstance(tests, (str, bytes, bytearray)):
        return []
    bounded: list[dict[str, Any]] = []
    for raw in list(tests)[:MAX_ARCHIVE_TESTS]:
        if not isinstance(raw, Mapping):
            continue
        item: dict[str, Any] = {}
        for key, limit in (
            ("name", 160),
            ("status", 32),
            ("message", MAX_TEXT),
            ("severity", 32),
            ("rule_code", 96),
            ("rule_description", MAX_TEXT),
            ("rule_solution", MAX_TEXT),
            ("risk_level", 32),
            ("why", MAX_TEXT),
            ("location", 192),
        ):
            if raw.get(key) not in (None, ""):
                item[key] = _safe_text(raw[key], limit)
        bounded.append(item)
    return bounded


def _bounded_target(value: Any) -> dict[str, Any]:
    if not isinstance(value, Mapping):
        return {}
    target: dict[str, Any] = {}
    for key, limit in (
        ("name", 160),
        ("format", 64),
        ("sha256", 64),
        ("kind", 32),
        ("reference", 256),
    ):
        if value.get(key) not in (None, ""):
            target[key] = _safe_text(value[key], limit)
    if value.get("size_bytes") is not None:
        target["size_bytes"] = _positive_int(value.get("size_bytes"))
    return target


def _bounded_archive_files(value: Any) -> list[dict[str, Any]]:
    """Keep the per-entry results of a bounded Static model analysis ZIP scan visible."""

    raw_files = value.get("files") if isinstance(value, Mapping) else None
    if not isinstance(raw_files, Sequence) or isinstance(raw_files, (str, bytes, bytearray)):
        return []
    bounded: list[dict[str, Any]] = []
    for index, raw in enumerate(list(raw_files)[:512], start=1):
        if not isinstance(raw, Mapping):
            continue
        summary = raw.get("summary") if isinstance(raw.get("summary"), Mapping) else {}
        engine = raw.get("engine") if isinstance(raw.get("engine"), Mapping) else {}
        tests = _bounded_tests(raw.get("tests"))
        tests_total = max(
            _positive_int(raw.get("tests_total")),
            len(tests),
        )
        item: dict[str, Any] = {
            "scan_order": max(1, _positive_int(raw.get("scan_order")) or index),
            "path": _safe_text(raw.get("path") or raw.get("name"), 240),
            "name": _safe_text(raw.get("name") or raw.get("path"), 160),
            "format": _safe_text(raw.get("format"), 64),
            "decision": _safe_text(raw.get("decision") or "error", 32),
            "scan_outcome": _safe_text(raw.get("scan_outcome") or "error", 32),
            "analysis_incomplete": _safe_bool(raw.get("analysis_incomplete")),
            "summary": {
                "critical": _positive_int(summary.get("critical")),
                "warning": _positive_int(summary.get("warning")),
                "info": _positive_int(summary.get("info")),
                "total": _positive_int(summary.get("total")),
                "checks": _positive_int(summary.get("checks")),
            },
            "tests": tests,
            "tests_total": tests_total,
            "tests_truncated": _safe_bool(raw.get("tests_truncated"))
            or tests_total > len(tests),
            "findings": _bounded_findings(raw.get("findings"), limit=5),
            "engine": {
                "name": _safe_text(engine.get("name") or "Static model analysis", 96),
                "version": _safe_text(engine.get("version") or "unknown", 64),
                "scanner": _safe_text(engine.get("scanner") or "unknown", 64),
                "duration_ms": _positive_int(engine.get("duration_ms")),
            },
        }
        for key in ("size_bytes",):
            if raw.get(key) is not None:
                item[key] = _positive_int(raw.get(key))
        sha256 = _safe_text(raw.get("sha256"), 64)
        if sha256:
            item["sha256"] = sha256
        bounded.append(item)
    return bounded


def _bounded_archive_info(value: Any) -> dict[str, Any]:
    raw = value.get("archive") if isinstance(value, Mapping) else None
    if not isinstance(raw, Mapping):
        return {}
    info: dict[str, Any] = {}
    for key in ("files_scanned", "files_skipped"):
        if raw.get(key) is not None:
            info[key] = _positive_int(raw.get(key))
    if raw.get("entry_limit_reached") is not None:
        info["entry_limit_reached"] = _safe_bool(raw.get("entry_limit_reached"))
    extensions = raw.get("supported_extensions")
    if isinstance(extensions, Sequence) and not isinstance(extensions, (str, bytes, bytearray)):
        info["supported_extensions"] = [
            _safe_text(extension, 64) for extension in list(extensions)[:256] if _safe_text(extension, 64)
        ]
    version = _safe_text(raw.get("scanner_version"), 64)
    if version:
        info["scanner_version"] = version
    return info


def _compact_archive_info(value: Any) -> dict[str, Any]:
    """Keep archive counters in the default output without repeating capabilities."""

    archive = _bounded_archive_info(value)
    return {
        key: archive[key]
        for key in ("files_scanned", "files_skipped", "entry_limit_reached")
        if key in archive
    }


def _compact_archive_files(files: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    """Keep file names and outcomes while leaving individual checks opt-in."""

    compact: list[dict[str, Any]] = []
    for index, raw in enumerate(files, start=1):
        summary = raw.get("summary") if isinstance(raw.get("summary"), Mapping) else {}
        item: dict[str, Any] = {
            "scan_order": _positive_int(raw.get("scan_order")) or index,
            "name": _safe_text(raw.get("name") or raw.get("path"), 160),
            "path": _safe_text(raw.get("path") or raw.get("name"), 240),
            "format": _safe_text(raw.get("format"), 64),
            "decision": _safe_text(raw.get("decision") or "error", 32),
            "scan_outcome": _safe_text(
                raw.get("scan_outcome") or raw.get("decision") or "error", 32
            ),
            "summary": {
                "critical": _positive_int(summary.get("critical")),
                "warning": _positive_int(summary.get("warning")),
                "info": _positive_int(summary.get("info")),
                "total": _positive_int(summary.get("total")),
                "checks": _positive_int(summary.get("checks")),
                "tests_total": max(
                    _positive_int(raw.get("tests_total")),
                    len(raw.get("tests") or [])
                    if isinstance(raw.get("tests"), Sequence)
                    and not isinstance(raw.get("tests"), (str, bytes, bytearray))
                    else 0,
                ),
            },
        }
        if raw.get("analysis_incomplete"):
            item["analysis_incomplete"] = _safe_bool(raw.get("analysis_incomplete"))
        findings = _bounded_findings(raw.get("findings"), limit=3)
        if findings:
            item["findings"] = findings
        compact.append(item)
    return compact


def _bounded_evidence(layer_id: str, value: Any) -> dict[str, Any]:
    """Retain only explicitly safe evidence fields from known adapters."""

    if not isinstance(value, Mapping):
        return {}
    evidence: dict[str, Any] = {}
    if layer_id == "artifact_provenance":
        evidence = {
            "verification_mode": _safe_text(value.get("verification_mode"), 32),
            "signature_verified": _safe_bool(value.get("signature_verified")),
            "digest_verified": _safe_bool(value.get("digest_verified")),
        }
        for key in ("certificate_identity", "certificate_oidc_issuer"):
            if value.get(key) not in (None, ""):
                evidence[key] = _safe_text(value[key], 256)
    elif layer_id == "container_image_scan":
        for key in ("scanners", "severities"):
            raw_items = value.get(key)
            if isinstance(raw_items, Sequence) and not isinstance(
                raw_items, (str, bytes, bytearray)
            ):
                evidence[key] = [
                    _safe_text(item, 32) for item in islice(raw_items, 16)
                ]
        category_counts = value.get("category_counts")
        if isinstance(category_counts, Mapping):
            evidence["category_counts"] = {
                key: _positive_int(category_counts.get(key))
                for key in (
                    "vulnerability",
                    "secret",
                    "misconfiguration",
                    "license",
                )
            }
        evidence["findings_total"] = _positive_int(value.get("findings_total"))
        image_digest = _safe_text(value.get("image_digest"), 96)
        if re.fullmatch(r"sha256:[a-fA-F0-9]{64}", image_digest):
            evidence["image_digest"] = image_digest.lower()
    return evidence


def make_layer_result(
    *,
    layer_id: str,
    engine_name: str,
    engine_version: str,
    decision: str,
    status: str,
    applicable: bool = True,
    target: Mapping[str, Any] | None = None,
    counts: Mapping[str, Any] | None = None,
    checks: Any = 0,
    findings: Any = None,
    duration_ms: Any = 0,
    coverage_complete: bool | None = None,
    reason_codes: Sequence[Any] | None = None,
    audit_id: str | None = None,
) -> dict[str, Any]:
    """Create one JSON-safe scanner result with bounded details."""

    normalized_layer = str(layer_id or "").lower()
    if not _SAFE_LAYER_ID.fullmatch(normalized_layer):
        raise ValueError("Invalid security layer identifier.")
    normalized_decision = str(decision or "error").lower()
    normalized_status = str(status or "error").lower()
    if normalized_decision not in _VALID_DECISIONS:
        normalized_decision = "error"
    if normalized_status not in _VALID_STATUSES:
        normalized_status = "error"

    raw_counts = counts if isinstance(counts, Mapping) else {}
    severity_counts = {
        "critical": _positive_int(raw_counts.get("critical")),
        "warning": _positive_int(raw_counts.get("warning")),
        "info": _positive_int(raw_counts.get("info")),
    }
    bounded_findings = _bounded_findings(findings, layer_id=normalized_layer)
    if not any(severity_counts.values()) and bounded_findings:
        for finding in bounded_findings:
            severity_counts[_severity(finding.get("severity"))] += 1

    coverage = (
        _safe_bool(coverage_complete)
        if coverage_complete is not None
        else normalized_status in {"complete", "not_applicable"}
    )
    reasons = []
    for reason in list(reason_codes or [])[:16]:
        safe_reason = _safe_text(reason, 96).lower().replace(" ", "_")
        if safe_reason and safe_reason not in reasons:
            reasons.append(safe_reason)

    normalized_audit_id = _safe_text(audit_id, 64)
    result = {
        "schema_version": LAYER_SCHEMA_VERSION,
        "audit_id": normalized_audit_id or str(uuid.uuid4()),
        "recorded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "layer_id": normalized_layer,
        "status": normalized_status,
        "applicable": _safe_bool(applicable, True),
        "decision": normalized_decision,
        "should_continue": normalized_decision == "allow",
        "target": _bounded_target(target or {}),
        "summary": {
            **severity_counts,
            "total": sum(severity_counts.values()),
            "checks": _positive_int(checks),
        },
        "coverage": {
            "complete": coverage,
            "reason_codes": reasons,
        },
        "findings": bounded_findings,
        "engine": {
            "name": _safe_text(engine_name, 96),
            "version": _safe_text(engine_version, 64),
            "duration_ms": _positive_int(duration_ms),
        },
    }
    json.dumps(result, ensure_ascii=False)
    return result


def _layer_as_normalized(value: Mapping[str, Any]) -> dict[str, Any]:
    layer_id = str(value.get("layer_id") or "").lower()
    engine = value.get("engine") if isinstance(value.get("engine"), Mapping) else {}
    summary = value.get("summary") if isinstance(value.get("summary"), Mapping) else {}
    coverage = value.get("coverage") if isinstance(value.get("coverage"), Mapping) else {}
    result = make_layer_result(
        layer_id=layer_id,
        engine_name=str(engine.get("name") or layer_id.title()),
        engine_version=str(engine.get("version") or "unknown"),
        decision=str(value.get("decision") or "error"),
        status=str(value.get("status") or "error"),
        applicable=_safe_bool(value.get("applicable", True), True),
        target=value.get("target") if isinstance(value.get("target"), Mapping) else {},
        counts=summary,
        checks=summary.get("checks", 0),
        findings=value.get("findings"),
        duration_ms=engine.get("duration_ms", 0),
        coverage_complete=_safe_bool(coverage.get("complete", False)),
        reason_codes=(
            coverage.get("reason_codes")
            if isinstance(coverage.get("reason_codes"), Sequence)
            and not isinstance(coverage.get("reason_codes"), (str, bytes, bytearray))
            else []
        ),
        audit_id=str(value.get("audit_id") or "") or None,
    )
    evidence = _bounded_evidence(layer_id, value.get("evidence"))
    if evidence:
        result["evidence"] = evidence
    files = _bounded_archive_files(value)
    if files:
        result["files"] = files
    archive = _bounded_archive_info(value)
    if archive:
        result["archive"] = archive
    if files:
        result["total_evaluation"] = _archive_total_evaluation(
            result["decision"],
            result["summary"],
            result["coverage"],
            files,
            archive,
            result["findings"],
        )
    return result


def _static_analysis_as_layer(value: Mapping[str, Any]) -> dict[str, Any]:
    decision = str(value.get("decision") or "error").lower()
    engine = value.get("engine") if isinstance(value.get("engine"), Mapping) else {}
    summary = value.get("summary") if isinstance(value.get("summary"), Mapping) else {}
    artifact = value.get("artifact") if isinstance(value.get("artifact"), Mapping) else {}
    status = str(value.get("scan_outcome") or "").lower()
    if status not in _VALID_STATUSES:
        status = "complete" if decision in {"allow", "review", "block"} else decision
    reasons: list[str] = []
    if value.get("analysis_incomplete"):
        reasons.append("analysis_incomplete")
    result = make_layer_result(
        layer_id="static_analysis",
        engine_name=str(engine.get("name") or "Static model analysis"),
        engine_version=str(engine.get("version") or "unknown"),
        decision=decision,
        status=status,
        applicable=True,
        target=artifact,
        counts=summary,
        checks=summary.get("checks", 0),
        findings=value.get("findings"),
        duration_ms=engine.get("duration_ms", 0),
        coverage_complete=not bool(value.get("analysis_incomplete")),
        reason_codes=reasons,
        audit_id=str(value.get("scan_id") or "") or None,
    )
    files = _bounded_archive_files(value)
    if files:
        result["files"] = files
    archive = _bounded_archive_info(value)
    if archive:
        result["archive"] = archive
    if files:
        result["total_evaluation"] = _archive_total_evaluation(
            result["decision"],
            result["summary"],
            result["coverage"],
            files,
            archive,
            result["findings"],
        )
    return result


def collect_layer_results(value: Any) -> list[dict[str, Any]]:
    """Unwrap workflow output wrappers and return normalized layer envelopes."""

    collected: list[dict[str, Any]] = []

    def visit(candidate: Any, depth: int = 0) -> None:
        if depth > 8 or candidate is None:
            return
        if isinstance(candidate, Sequence) and not isinstance(candidate, (str, bytes, bytearray)):
            for item in candidate:
                visit(item, depth + 1)
            return
        if not isinstance(candidate, Mapping):
            return

        schema = str(candidate.get("schema_version") or "")
        if schema == LAYER_SCHEMA_VERSION:
            try:
                collected.append(_layer_as_normalized(candidate))
            except ValueError:
                return
            return
        if (
            candidate.get("layer_id")
            and candidate.get("decision")
            and isinstance(candidate.get("summary"), Mapping)
        ):
            try:
                collected.append(_layer_as_normalized(candidate))
            except ValueError:
                return
            return
        if schema == AUDIT_SCHEMA_VERSION and isinstance(candidate.get("layers"), list):
            visit(candidate["layers"], depth + 1)
            return
        engine = candidate.get("engine")
        if (
            "decision" in candidate
            and isinstance(engine, Mapping)
            and str(engine.get("name") or "").lower() == "static model analysis"
            and isinstance(candidate.get("artifact"), Mapping)
        ):
            collected.append(_static_analysis_as_layer(candidate))
            return

        for key in ("audit_result", "scan_result", "audit", "output", "result", "value"):
            if key in candidate:
                visit(candidate[key], depth + 1)
                return

    visit(value)
    return collected


def parse_layer_ids(value: Any, default: Sequence[str] = ("static_analysis",)) -> list[str]:
    parsed = value
    if value is None or value == "":
        parsed = list(default)
    elif isinstance(value, str):
        stripped = value.strip()
        if stripped.startswith("["):
            try:
                parsed = json.loads(stripped)
            except json.JSONDecodeError as exc:
                raise ValueError("required_layers must be a JSON array or comma-separated list.") from exc
        else:
            parsed = [item.strip() for item in stripped.split(",") if item.strip()]
    if not isinstance(parsed, Sequence) or isinstance(parsed, (str, bytes, bytearray)):
        raise ValueError("required_layers must be a list.")
    result: list[str] = []
    for item in parsed:
        layer_id = str(item).strip().lower()
        if not _SAFE_LAYER_ID.fullmatch(layer_id):
            raise ValueError("required_layers contains an invalid layer identifier.")
        if layer_id not in result:
            result.append(layer_id)
    return result


def _compact_target(value: Any) -> dict[str, Any]:
    bounded = _bounded_target(value)
    return {
        key: bounded[key]
        for key in ("name", "format", "reference")
        if key in bounded
    }


def _compact_findings(
    findings: Any,
    *,
    limit: int,
    retain_layer_id: bool = False,
) -> list[dict[str, Any]]:
    if not isinstance(findings, Sequence) or isinstance(
        findings, (str, bytes, bytearray)
    ):
        return []

    result: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str, str, str]] = set()
    for raw in islice(findings, MAX_FINDING_CANDIDATES):
        item = raw if isinstance(raw, Mapping) else {"message": raw}
        normalized = _bounded_findings([item], 1)
        if not normalized:
            continue
        finding = normalized[0]
        layer_id = _safe_text(item.get("layer_id"), 64).lower()
        key = (
            layer_id,
            str(finding.get("severity") or ""),
            str(finding.get("title") or ""),
            str(finding.get("rule_code") or ""),
            str(finding.get("message") or ""),
        )
        if key in seen:
            continue
        seen.add(key)

        compact: dict[str, Any] = {
            "severity": finding["severity"],
            "title": finding["title"],
        }
        if retain_layer_id and layer_id:
            compact["layer_id"] = layer_id
        for field in (
            "message",
            "rule_code",
            "rule_description",
            "rule_solution",
            "risk_level",
            "category",
            "remediation",
            "fixed_version",
        ):
            if finding.get(field) not in (None, ""):
                compact[field] = finding[field]
        result.append(compact)
        if len(result) >= max(0, limit):
            break
    return result


def _decision_message(
    decision: Any,
    summary: Mapping[str, Any],
    *,
    layer_id: str | None = None,
    applicable: bool = True,
) -> str:
    normalized = str(decision or "inconclusive").lower()
    critical = _positive_int(summary.get("critical"))
    warning = _positive_int(summary.get("warning"))
    label = _LAYER_LABELS.get(str(layer_id or ""), str(layer_id or "Security scan"))

    if not applicable:
        return f"Not applicable: {label} does not inspect this target format."
    if normalized == "allow":
        return (
            f"Passed: {label} completed without retained findings."
            if layer_id
            else "Allowed: all required security layers passed."
        )
    if normalized == "block":
        return (
            f"Blocked: {critical} critical finding(s) detected."
            if critical
            else "Blocked by security policy."
        )
    if normalized == "review":
        return (
            f"Review required: {warning} warning(s) require review."
            if warning
            else "Review required: manual review is required."
        )
    if normalized == "error":
        return "Scan error: the security decision is fail-closed."
    return "Inconclusive: one or more required security checks did not complete."


def _archive_total_evaluation(
    decision: Any,
    summary: Mapping[str, Any],
    coverage: Mapping[str, Any],
    files: Sequence[Mapping[str, Any]],
    archive: Mapping[str, Any],
    findings: Any,
) -> dict[str, Any]:
    normalized_decision = str(decision or "inconclusive").lower()
    counts = {
        "critical": _positive_int(summary.get("critical")),
        "warning": _positive_int(summary.get("warning")),
        "info": _positive_int(summary.get("info")),
    }
    checks = 0
    tests_total = 0
    analysis_incomplete = False
    tests_truncated = False
    for file_result in files:
        file_summary = (
            file_result.get("summary")
            if isinstance(file_result.get("summary"), Mapping)
            else {}
        )
        file_checks = _positive_int(file_summary.get("checks"))
        file_tests = max(
            file_checks,
            _positive_int(file_result.get("tests_total")),
        )
        checks += file_checks
        tests_total += file_tests
        analysis_incomplete = analysis_incomplete or _safe_bool(
            file_result.get("analysis_incomplete")
        )
        tests_truncated = tests_truncated or _safe_bool(
            file_result.get("tests_truncated")
        )

    total_summary = {
        **counts,
        "total": sum(counts.values()),
        "checks": checks,
        "tests_total": tests_total,
    }
    return {
        "decision": normalized_decision,
        "should_continue": normalized_decision == "allow",
        "scan_outcome": (
            "complete"
            if normalized_decision in {"allow", "review", "block"}
            else normalized_decision
        ),
        "analysis_incomplete": analysis_incomplete,
        "tests_truncated": tests_truncated,
        "message": _decision_message(normalized_decision, total_summary),
        "summary": total_summary,
        "coverage": {
            "complete": _safe_bool(coverage.get("complete", False)),
        },
        "files_scanned": (
            _positive_int(archive["files_scanned"])
            if "files_scanned" in archive
            else len(files)
        ),
        "files_skipped": _positive_int(archive.get("files_skipped")),
        "findings": _bounded_findings(findings, limit=MAX_AUDIT_FINDINGS),
    }


def compact_layer_result(
    value: Mapping[str, Any],
    *,
    include_findings: bool = True,
    include_target: bool = True,
    embedded: bool = False,
    finding_limit: int = MAX_PUBLIC_LAYER_FINDINGS,
) -> dict[str, Any]:
    """Return the default low-noise layer contract exposed by workflow nodes."""

    schema = str(value.get("schema_version") or "")
    if schema == LAYER_SCHEMA_VERSION or value.get("layer_id"):
        normalized = _layer_as_normalized(value)
    else:
        layers = collect_layer_results(value)
        if not layers:
            raise ValueError("Value does not contain a supported security-layer result.")
        normalized = layers[0]

    layer_id = str(normalized.get("layer_id") or "")
    summary = normalized.get("summary") if isinstance(normalized.get("summary"), Mapping) else {}
    coverage = normalized.get("coverage") if isinstance(normalized.get("coverage"), Mapping) else {}
    applicable = _safe_bool(normalized.get("applicable", True), True)
    compact_summary = {
        "critical": _positive_int(summary.get("critical")),
        "warning": _positive_int(summary.get("warning")),
        "info": _positive_int(summary.get("info")),
        "total": _positive_int(summary.get("total")),
    }
    reasons = [
        _safe_text(reason, 96)
        for reason in list(coverage.get("reason_codes") or [])[:8]
        if _safe_text(reason, 96)
    ]
    compact: dict[str, Any] = {
        "schema_version": LAYER_SCHEMA_VERSION,
        "layer_id": layer_id,
        "decision": str(normalized.get("decision") or "inconclusive"),
        "should_continue": str(normalized.get("decision")) == "allow",
        "status": str(normalized.get("status") or "inconclusive"),
        "message": _decision_message(
            normalized.get("decision"),
            compact_summary,
            layer_id=layer_id,
            applicable=applicable,
        ),
    }
    if include_target:
        target = _compact_target(normalized.get("target"))
        if target:
            compact["target"] = target
    compact["summary"] = compact_summary
    compact["coverage"] = {"complete": _safe_bool(coverage.get("complete", False))}
    if reasons:
        compact["coverage"]["reason_codes"] = reasons
    if not applicable:
        compact["applicable"] = False
    if include_findings:
        compact["findings"] = _compact_findings(
            normalized.get("findings"), limit=finding_limit
        )
    files = _bounded_archive_files(normalized)
    if files:
        compact["files"] = _compact_archive_files(files)
    archive = _compact_archive_info(normalized)
    if archive:
        compact["archive"] = archive
    if files:
        total_evaluation = _archive_total_evaluation(
            compact["decision"],
            summary,
            compact["coverage"],
            files,
            archive,
            normalized.get("findings"),
        )
        total_evaluation.pop("findings", None)
        compact["total_evaluation"] = total_evaluation
    evidence = _bounded_evidence(layer_id, normalized.get("evidence"))
    if evidence:
        compact["evidence"] = evidence
    if embedded:
        compact.pop("schema_version", None)
        compact.pop("should_continue", None)
    json.dumps(compact, ensure_ascii=False)
    return compact


def compact_audit_result(value: Mapping[str, Any]) -> dict[str, Any]:
    """Remove diagnostic IDs, timestamps and duplicate findings from an audit."""

    if str(value.get("schema_version") or "") != AUDIT_SCHEMA_VERSION:
        raise ValueError("Value is not a layered security audit.")
    summary = value.get("summary") if isinstance(value.get("summary"), Mapping) else {}
    policy = value.get("policy") if isinstance(value.get("policy"), Mapping) else {}
    coverage = value.get("coverage") if isinstance(value.get("coverage"), Mapping) else {}
    layers = value.get("layers") if isinstance(value.get("layers"), list) else []

    compact_summary = {
        "critical": _positive_int(summary.get("critical")),
        "warning": _positive_int(summary.get("warning")),
        "info": _positive_int(summary.get("info")),
        "layers_passed": _positive_int(summary.get("layers_passed")),
        "layers_total": _positive_int(summary.get("layers_total")),
    }
    normalized_decision = str(value.get("decision") or "inconclusive")
    compact: dict[str, Any] = {
        "schema_version": AUDIT_SCHEMA_VERSION,
        "decision": normalized_decision,
        "should_continue": normalized_decision == "allow",
        "message": _decision_message(normalized_decision, compact_summary),
    }
    target = _compact_target(value.get("target"))
    if target:
        compact["target"] = target
    profile = _safe_text(policy.get("profile"), 32)
    if profile:
        compact["policy"] = {"profile": profile}
        required_layers = parse_layer_ids(policy.get("required_layers"), default=())
        if required_layers:
            compact["policy"]["required_layers"] = required_layers
    compact["summary"] = compact_summary
    compact["coverage"] = {
        "complete": _safe_bool(
            coverage.get("complete", summary.get("coverage_complete", False))
        ),
    }
    for key in (
        "missing_required_layers",
        "incomplete_required_layers",
        "duplicate_layer_ids",
    ):
        items = coverage.get(key)
        if isinstance(items, Sequence) and not isinstance(items, (str, bytes, bytearray)):
            bounded_items = [_safe_text(item, 64) for item in list(items)[:16] if _safe_text(item, 64)]
            if bounded_items:
                compact["coverage"][key] = bounded_items
    compact_layers = [
        compact_layer_result(
            layer,
            include_findings=False,
            include_target=False,
            embedded=True,
        )
        for layer in layers
        if isinstance(layer, Mapping)
    ]
    compact["layers"] = [
        {
            key: layer[key]
            for key in (
                "layer_id",
                "decision",
                "should_continue",
                "status",
                "message",
                "summary",
                "coverage",
                "applicable",
            )
            if key in layer
        }
        for layer in compact_layers
    ]
    compact["top_findings"] = _compact_findings(
        value.get("top_findings"),
        limit=MAX_AUDIT_FINDINGS,
        retain_layer_id=True,
    )
    scanner_groups: dict[str, dict[str, Any]] = {}
    for layer in compact_layers:
        layer_id = str(layer.get("layer_id") or "security").lower()
        scanner_name = _LAYER_LABELS.get(layer_id, layer_id.title())
        group = {
            key: deepcopy(layer[key])
            for key in (
                "decision",
                "should_continue",
                "status",
                "summary",
                "coverage",
                "evidence",
            )
            if key in layer
        }
        for key in ("files", "archive", "total_evaluation"):
            if key in layer:
                group[key] = deepcopy(layer[key])
        scanner_groups[scanner_name] = group
    if scanner_groups:
        compact["scanners"] = scanner_groups
    archive_files = [
        file_result
        for layer in compact_layers
        if isinstance(layer, Mapping)
        for file_result in _bounded_archive_files(layer)
    ]
    archive_info = next(
        (
            layer.get("archive")
            for layer in compact_layers
            if isinstance(layer, Mapping)
            and isinstance(layer.get("archive"), Mapping)
        ),
        {},
    )
    if archive_files:
        raw_total_evaluation = value.get("total_evaluation")
        total_evaluation = (
            raw_total_evaluation
            if isinstance(raw_total_evaluation, Mapping)
            else {}
        )
        compact["total_evaluation"] = (
            {
                key: deepcopy(total_evaluation[key])
                for key in (
                    "decision",
                    "should_continue",
                    "scan_outcome",
                    "analysis_incomplete",
                    "tests_truncated",
                    "summary",
                    "files_scanned",
                    "files_skipped",
                )
                if key in total_evaluation
            }
            if total_evaluation
            else {
                key: item
                for key, item in _archive_total_evaluation(
                    normalized_decision,
                    summary,
                    compact["coverage"],
                    archive_files,
                    archive_info,
                    compact["top_findings"],
                ).items()
                if key != "findings"
            }
        )
    json.dumps(compact, ensure_ascii=False)
    return compact


def compact_security_result(value: Mapping[str, Any]) -> dict[str, Any]:
    """Compact either an aggregate audit, a shared layer, or native Static model analysis output."""

    if str(value.get("schema_version") or "") == AUDIT_SCHEMA_VERSION:
        return compact_audit_result(value)
    return compact_layer_result(value)


def present_security_result(
    value: Mapping[str, Any], *, include_details: Any = False
) -> dict[str, Any]:
    """Select compact default output or the bounded diagnostic contract."""

    if _safe_bool(include_details):
        detailed = deepcopy(dict(value))
        json.dumps(detailed, ensure_ascii=False)
        return detailed
    return compact_security_result(value)


class SecurityPolicyService:
    """Aggregate scanner envelopes without majority voting."""

    def evaluate(
        self,
        values: Any,
        *,
        profile: Any = "balanced",
        required_layers: Any = None,
    ) -> dict[str, Any]:
        layers = collect_layer_results(values)
        profile_name = str(profile or "balanced").lower()
        if profile_name not in {"balanced", "strict"}:
            raise ValueError("Unsupported security policy profile.")

        # A duplicate layer is a contract violation. Never let a later clean
        # result overwrite an earlier block from the same scanner identity.
        by_id: dict[str, dict[str, Any]] = {}
        duplicate_layer_ids: set[str] = set()
        for layer in layers:
            layer_id = str(layer.get("layer_id") or "")
            if not _SAFE_LAYER_ID.fullmatch(layer_id):
                continue
            if layer_id not in by_id:
                by_id[layer_id] = layer
                continue

            duplicate_layer_ids.add(layer_id)
            existing = by_id[layer_id]
            existing_summary = (
                existing.get("summary")
                if isinstance(existing.get("summary"), Mapping)
                else {}
            )
            incoming_summary = (
                layer.get("summary")
                if isinstance(layer.get("summary"), Mapping)
                else {}
            )
            existing_blocks = (
                str(existing.get("decision")) == "block"
                or _positive_int(existing_summary.get("critical")) > 0
            )
            incoming_blocks = (
                str(layer.get("decision")) == "block"
                or _positive_int(incoming_summary.get("critical")) > 0
            )
            if existing_blocks:
                continue
            if incoming_blocks:
                by_id[layer_id] = layer
                continue
            target = existing.get("target") or layer.get("target")
            by_id[layer_id] = make_layer_result(
                layer_id=layer_id,
                engine_name="Security Policy Gate",
                engine_version=POLICY_VERSION,
                decision="error",
                status="error",
                target=target if isinstance(target, Mapping) else {},
                findings=[
                    {
                        "severity": "warning",
                        "title": "Duplicate security layer result",
                        "message": "Multiple results used the same security layer identifier.",
                        "rule_code": "duplicate-layer-result",
                    }
                ],
                coverage_complete=False,
                reason_codes=["duplicate_layer_result"],
            )
        normalized_layers = list(by_id.values())

        required = set(parse_layer_ids(required_layers))
        if profile_name == "strict":
            required.update(
                str(layer.get("layer_id"))
                for layer in normalized_layers
                if bool(layer.get("applicable", True))
            )

        present = {str(layer.get("layer_id")) for layer in normalized_layers}
        missing_required = sorted(required - present)
        required_incomplete = sorted(
            str(layer.get("layer_id"))
            for layer in normalized_layers
            if str(layer.get("layer_id")) in required
            and bool(layer.get("applicable", True))
            and (
                str(layer.get("decision")) in {"inconclusive", "error"}
                or str(layer.get("status"))
                in {"unsupported", "timeout", "inconclusive", "error"}
                or not bool(
                    (layer.get("coverage") or {}).get("complete")
                    if isinstance(layer.get("coverage"), Mapping)
                    else False
                )
            )
        )

        total_counts = {"critical": 0, "warning": 0, "info": 0}
        all_findings: list[dict[str, Any]] = []
        for layer in normalized_layers:
            summary = layer.get("summary") if isinstance(layer.get("summary"), Mapping) else {}
            for severity in total_counts:
                total_counts[severity] += _positive_int(summary.get(severity))
            for finding in _bounded_findings(layer.get("findings")):
                all_findings.append({"layer_id": layer.get("layer_id"), **finding})
        all_findings.sort(key=lambda item: _SEVERITY_ORDER.get(str(item.get("severity")), 3))

        has_block = any(str(layer.get("decision")) == "block" for layer in normalized_layers)
        has_review = any(str(layer.get("decision")) == "review" for layer in normalized_layers)
        advisory_failure = any(
            str(layer.get("layer_id")) not in required
            and bool(layer.get("applicable", True))
            and str(layer.get("decision")) in {"inconclusive", "error"}
            for layer in normalized_layers
        )

        if has_block or total_counts["critical"] > 0:
            decision = "block"
        elif not normalized_layers or missing_required or required_incomplete:
            decision = "inconclusive"
        elif has_review or total_counts["warning"] > 0 or advisory_failure:
            decision = "review"
        else:
            decision = "allow"

        applicable_layers = [layer for layer in normalized_layers if bool(layer.get("applicable", True))]
        passed_layers = [
            layer
            for layer in applicable_layers
            if str(layer.get("status")) == "complete"
            and str(layer.get("decision")) == "allow"
            and bool((layer.get("coverage") or {}).get("complete", False))
        ]
        target = next(
            (
                layer.get("target")
                for layer in normalized_layers
                if isinstance(layer.get("target"), Mapping) and bool(layer.get("target"))
            ),
            {},
        )
        compact_layers = deepcopy(normalized_layers)
        for compact_layer in compact_layers:
            compact_layer["findings"] = _bounded_findings(
                compact_layer.get("findings"), MAX_AUDIT_LAYER_FINDINGS
            )

        audit = {
            "schema_version": AUDIT_SCHEMA_VERSION,
            "audit_id": str(uuid.uuid4()),
            "recorded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "decision": decision,
            "should_continue": decision == "allow",
            "policy": {
                "profile": profile_name,
                "version": POLICY_VERSION,
                "required_layers": sorted(required),
            },
            "target": _bounded_target(target),
            "summary": {
                **total_counts,
                "total": sum(total_counts.values()),
                "layers_passed": len(passed_layers),
                "layers_total": len(applicable_layers),
                "coverage_complete": not missing_required
                and not required_incomplete
                and not duplicate_layer_ids,
            },
            "coverage": {
                "missing_required_layers": missing_required,
                "incomplete_required_layers": required_incomplete,
                "duplicate_layer_ids": sorted(duplicate_layer_ids),
            },
            "layers": compact_layers,
            "top_findings": deepcopy(all_findings[:MAX_AUDIT_FINDINGS]),
        }
        archive_files = [
            file_result
            for layer in compact_layers
            if isinstance(layer, Mapping)
            for file_result in _bounded_archive_files(layer)
        ]
        archive_info = next(
            (
                layer.get("archive")
                for layer in compact_layers
                if isinstance(layer, Mapping)
                and isinstance(layer.get("archive"), Mapping)
            ),
            {},
        )
        if archive_files:
            audit["files"] = archive_files
            if archive_info:
                audit["archive"] = dict(archive_info)
            audit["total_evaluation"] = _archive_total_evaluation(
                decision,
                audit["summary"],
                {"complete": audit["summary"]["coverage_complete"]},
                archive_files,
                archive_info,
                audit["top_findings"],
            )
        json.dumps(audit, ensure_ascii=False)
        return audit


security_policy_service = SecurityPolicyService()


__all__ = [
    "AUDIT_SCHEMA_VERSION",
    "LAYER_SCHEMA_VERSION",
    "SecurityPolicyService",
    "collect_layer_results",
    "compact_audit_result",
    "compact_layer_result",
    "compact_security_result",
    "make_layer_result",
    "parse_layer_ids",
    "present_security_result",
    "security_policy_service",
]
