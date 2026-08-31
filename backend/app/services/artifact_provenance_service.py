"""Fail-closed Artifact provenance verification for model artifacts and Sigstore bundles."""

from __future__ import annotations

import json
import logging
import time
from collections.abc import Callable, Mapping
from contextlib import ExitStack
from typing import Any, Protocol
from urllib.parse import urlparse

from app.services.model_artifact_analysis_service import (
    DEFAULT_MAX_BYTES,
    DEFAULT_TIMEOUT_SECONDS,
    StagedModelArtifact,
    stage_model_artifact,
)
from app.services.security_audit_service import make_layer_result
from app.services.security_command_runner import (
    SecurityCommandResult,
    SecurityCommandTimeoutError,
    SecurityCommandUnavailableError,
    resolve_security_binary,
    run_security_command,
)


logger = logging.getLogger(__name__)

ARTIFACT_PROVENANCE_VERSION = "3.1.2"
MAX_PROVENANCE_MATERIAL_BYTES = 8 * 1024 * 1024


class ArtifactProvenanceRunner(Protocol):
    def verify_blob(
        self,
        artifact_path: str,
        *,
        verification_mode: str,
        timeout_seconds: int,
        bundle_path: str | None = None,
        public_key_path: str | None = None,
        signature_path: str | None = None,
        certificate_identity: str | None = None,
        certificate_oidc_issuer: str | None = None,
    ) -> dict[str, Any]:
        """Verify one blob and return a bounded operational result."""


def _safe_identity(value: Any, *, field: str) -> str | None:
    normalized = " ".join(str(value or "").replace("\x00", "").split())
    if not normalized:
        return None
    if len(normalized) > 256:
        raise ValueError(f"{field} is too long.")
    return normalized


def _safe_issuer(value: Any) -> str | None:
    issuer = _safe_identity(value, field="certificate_oidc_issuer")
    if not issuer:
        return None
    parsed = urlparse(issuer)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("certificate_oidc_issuer must be an HTTPS origin.")
    return issuer.rstrip("/")


def _provenance_file_result(
    target: Mapping[str, Any],
    *,
    decision: str,
    checks: int,
    findings: list[dict[str, Any]],
    engine_version: str,
    duration_ms: int = 0,
) -> dict[str, Any]:
    critical = sum(1 for item in findings if item.get("severity") == "critical")
    warning = sum(1 for item in findings if item.get("severity") == "warning")
    name = str(target.get("name") or "artifact")
    return {
        "scan_order": 1,
        "path": name,
        "name": name,
        "format": str(target.get("format") or "unknown"),
        "decision": decision,
        "scan_outcome": "complete"
        if decision in {"allow", "review", "block"}
        else decision,
        "analysis_incomplete": decision in {"error", "inconclusive"},
        "summary": {
            "critical": critical,
            "warning": warning,
            "info": 0,
            "total": critical + warning,
            "checks": max(0, int(checks)),
        },
        "tests": [],
        "tests_total": max(0, int(checks)),
        "tests_truncated": False,
        "findings": findings[:5],
        "engine": {
            "name": "Artifact provenance",
            "version": engine_version,
            "scanner": "artifact_provenance",
            "duration_ms": max(0, int(duration_ms)),
        },
    }


class CliArtifactProvenanceRunner:
    """Invoke a locally installed, explicitly resolved Artifact provenance binary."""

    def __init__(self, binary: str | None = None):
        self._binary = binary

    def _resolved_binary(self) -> str:
        if self._binary:
            return resolve_security_binary(self._binary, "KAI_PROVENANCE_BINARY")
        return resolve_security_binary("cosign", "KAI_PROVENANCE_BINARY")

    def verify_blob(
        self,
        artifact_path: str,
        *,
        verification_mode: str,
        timeout_seconds: int,
        bundle_path: str | None = None,
        public_key_path: str | None = None,
        signature_path: str | None = None,
        certificate_identity: str | None = None,
        certificate_oidc_issuer: str | None = None,
    ) -> dict[str, Any]:
        binary = self._resolved_binary()
        args = [binary, "verify-blob"]
        if verification_mode == "bundle":
            if not bundle_path:
                raise ValueError("A Sigstore bundle is required.")
            args.extend(["--bundle", bundle_path])
            if certificate_identity:
                args.extend(["--certificate-identity", certificate_identity])
            if certificate_oidc_issuer:
                args.extend(["--certificate-oidc-issuer", certificate_oidc_issuer])
        elif verification_mode == "public_key":
            if not public_key_path or not signature_path:
                raise ValueError("A public key and detached signature are required.")
            args.extend(
                ["--key", public_key_path, "--signature", signature_path]
            )
        else:
            raise ValueError("Unsupported Artifact provenance verification mode.")
        args.append(artifact_path)
        command_result: SecurityCommandResult = run_security_command(
            args, timeout_seconds=timeout_seconds
        )
        return {
            "verified": command_result.returncode == 0,
            "returncode": command_result.returncode,
            "duration_ms": command_result.duration_ms,
            "engine_version": ARTIFACT_PROVENANCE_VERSION,
        }


class ArtifactProvenanceService:
    def __init__(self, runner: ArtifactProvenanceRunner | None = None):
        self._runner = runner or CliArtifactProvenanceRunner()

    def verify_staged(
        self,
        staged: StagedModelArtifact,
        *,
        verification_mode: Any = "bundle",
        bundle_source: Any = None,
        public_key_source: Any = None,
        signature_source: Any = None,
        certificate_identity: Any = None,
        certificate_oidc_issuer: Any = None,
        credential_lookup: Callable[[str], Any] | None = None,
        owner_id: Any = None,
    ) -> dict[str, Any]:
        mode = str(verification_mode or "bundle").lower()
        identity: str | None = None
        issuer: str | None = None
        target = {
            "name": staged.name,
            "format": staged.format,
            "size_bytes": staged.size_bytes,
            "sha256": staged.sha256,
            "kind": "model_artifact",
        }
        started = time.monotonic()
        try:
            identity = _safe_identity(
                certificate_identity, field="certificate_identity"
            )
            issuer = _safe_issuer(certificate_oidc_issuer)
            if bool(identity) != bool(issuer):
                raise ValueError(
                    "certificate_identity and certificate_oidc_issuer must be provided together."
                )
            if mode == "bundle" and (not identity or not issuer):
                raise ValueError(
                    "Bundle verification requires an approved certificate identity and OIDC issuer."
                )

            with ExitStack() as stack:
                material_kwargs = {
                    "credential_lookup": credential_lookup,
                    "owner_id": owner_id,
                    "max_bytes": MAX_PROVENANCE_MATERIAL_BYTES,
                    "timeout_seconds": staged.remaining_seconds(),
                    "prefix": "kai-artifact_provenance-material-",
                }
                bundle_path = None
                public_key_path = None
                signature_path = None
                if mode == "bundle":
                    if bundle_source in (None, "", {}):
                        raise ValueError("A Sigstore bundle source is required.")
                    bundle = stack.enter_context(
                        stage_model_artifact(bundle_source, **material_kwargs)
                    )
                    bundle_path = bundle.path
                elif mode == "public_key":
                    if public_key_source in (None, "", {}) or signature_source in (
                        None,
                        "",
                        {},
                    ):
                        raise ValueError(
                            "Public key and detached signature sources are required."
                        )
                    public_key = stack.enter_context(
                        stage_model_artifact(public_key_source, **material_kwargs)
                    )
                    signature = stack.enter_context(
                        stage_model_artifact(signature_source, **material_kwargs)
                    )
                    public_key_path = public_key.path
                    signature_path = signature.path
                else:
                    raise ValueError("Unsupported Artifact provenance verification mode.")

                raw = self._runner.verify_blob(
                    staged.path,
                    verification_mode=mode,
                    timeout_seconds=staged.remaining_seconds(),
                    bundle_path=bundle_path,
                    public_key_path=public_key_path,
                    signature_path=signature_path,
                    certificate_identity=identity,
                    certificate_oidc_issuer=issuer,
                )
            verified = raw.get("verified") is True
            decision = "allow" if verified else "block"
            findings = []
            if not verified:
                findings.append(
                    {
                        "severity": "critical",
                        "title": "Artifact provenance verification failed",
                        "message": "The model signature, signer identity, or signed digest could not be verified.",
                        "rule_code": "artifact_provenance-verification-failed",
                        "remediation": "Quarantine the artifact and obtain a valid signature from an approved publisher.",
                    }
                )
            result = make_layer_result(
                layer_id="artifact_provenance",
                engine_name="Artifact provenance",
                engine_version=str(raw.get("engine_version") or ARTIFACT_PROVENANCE_VERSION),
                decision=decision,
                status="complete",
                target=target,
                counts={"critical": 0 if verified else 1},
                checks=3 + int(bool(identity)),
                findings=findings,
                duration_ms=raw.get("duration_ms", 0),
                coverage_complete=True,
            )
            result["evidence"] = {
                "verification_mode": mode,
                "signature_verified": verified,
                "digest_verified": verified,
                "certificate_identity": identity,
                "certificate_oidc_issuer": issuer,
            }
            result["files"] = [
                _provenance_file_result(
                    target,
                    decision=decision,
                    checks=3 + int(bool(identity)),
                    findings=findings,
                    engine_version=str(raw.get("engine_version") or ARTIFACT_PROVENANCE_VERSION),
                    duration_ms=raw.get("duration_ms", 0),
                )
            ]
            json.dumps(result, ensure_ascii=False)
            return result
        except SecurityCommandTimeoutError:
            status = "timeout"
            reason = "timeout"
        except SecurityCommandUnavailableError:
            status = "error"
            reason = "engine_unavailable"
        except ValueError:
            status = "error"
            reason = "invalid_configuration_or_material"
        except Exception as exc:
            logger.error("Artifact provenance verification failed: error_type=%s", type(exc).__name__)
            status = "error"
            reason = "verification_error"
        result = make_layer_result(
            layer_id="artifact_provenance",
            engine_name="Artifact provenance",
            engine_version=ARTIFACT_PROVENANCE_VERSION,
            decision="error",
            status=status,
            target=target,
            duration_ms=int((time.monotonic() - started) * 1000),
            coverage_complete=False,
            reason_codes=[reason],
        )
        result["files"] = [
            _provenance_file_result(
                target,
                decision="error",
                checks=0,
                findings=[],
                engine_version=ARTIFACT_PROVENANCE_VERSION,
                duration_ms=int((time.monotonic() - started) * 1000),
            )
        ]
        return result

    def verify(
        self,
        artifact_value: Any,
        *,
        credential_lookup: Callable[[str], Any] | None = None,
        owner_id: Any = None,
        max_bytes: Any = DEFAULT_MAX_BYTES,
        timeout_seconds: Any = DEFAULT_TIMEOUT_SECONDS,
        **verification: Any,
    ) -> dict[str, Any]:
        try:
            with stage_model_artifact(
                artifact_value,
                credential_lookup=credential_lookup,
                owner_id=owner_id,
                max_bytes=max_bytes,
                timeout_seconds=timeout_seconds,
                prefix="kai-artifact_provenance-artifact-",
            ) as staged:
                return self.verify_staged(
                    staged,
                    credential_lookup=credential_lookup,
                    owner_id=owner_id,
                    **verification,
                )
        except Exception as exc:
            logger.error("Artifact provenance artifact staging failed: error_type=%s", type(exc).__name__)
            return make_layer_result(
                layer_id="artifact_provenance",
                engine_name="Artifact provenance",
                engine_version=ARTIFACT_PROVENANCE_VERSION,
                decision="error",
                status="error",
                coverage_complete=False,
                reason_codes=["artifact_staging_error"],
            )


artifact_provenance_service = ArtifactProvenanceService()


__all__ = [
    "ARTIFACT_PROVENANCE_VERSION",
    "CliArtifactProvenanceRunner",
    "ArtifactProvenanceService",
    "artifact_provenance_service",
]
