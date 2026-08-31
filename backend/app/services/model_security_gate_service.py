"""Composite Static model analysis security gate with optional orthogonal controls."""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Any

from app.services.artifact_provenance_service import ArtifactProvenanceService, artifact_provenance_service
from app.services.pickle_security_service import (
    DEFAULT_PICKLE_MAX_BYTES,
    PickleSecurityService,
    pickle_security_service,
)
from app.services.model_artifact_analysis_service import (
    ArtifactDiskSpaceError,
    DEFAULT_MAX_BYTES,
    DEFAULT_TIMEOUT_SECONDS,
    ModelArtifactAnalysisService,
    model_artifact_analysis_service,
    stage_model_artifact,
)
from app.services.security_audit_service import (
    SecurityPolicyService,
    collect_layer_results,
    make_layer_result,
    parse_layer_ids,
    security_policy_service,
)
from app.services.container_image_scan_service import ContainerImageScanService, container_image_scan_service


logger = logging.getLogger(__name__)

SUPPORTED_OPERATIONS = {
    "security_gate",
    "static_analysis",
    "pickle_security",
    "artifact_provenance",
    "container_image_scan",
}


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


def _error_layer(
    layer_id: str,
    engine_name: str,
    reason_codes: list[str] | None = None,
) -> dict[str, Any]:
    return make_layer_result(
        layer_id=layer_id,
        engine_name=engine_name,
        engine_version="unknown",
        decision="error",
        status="error",
        applicable=True,
        coverage_complete=False,
        reason_codes=reason_codes or ["layer_error"],
    )


class ModelSecurityGateService:
    """Run the default low-noise model security profile behind one node."""

    def __init__(
        self,
        *,
        static_analysis: ModelArtifactAnalysisService | None = None,
        pickle_security: PickleSecurityService | None = None,
        artifact_provenance: ArtifactProvenanceService | None = None,
        container_image_scan: ContainerImageScanService | None = None,
        policy: SecurityPolicyService | None = None,
    ):
        self._static_analysis = static_analysis or model_artifact_analysis_service
        self._pickle_security = pickle_security or pickle_security_service
        self._provenance = artifact_provenance or artifact_provenance_service
        self._image_scan = container_image_scan or container_image_scan_service
        self._policy = policy or security_policy_service

    def scan(
        self,
        artifact_value: Any,
        *,
        operation: Any = "security_gate",
        credential_lookup: Callable[[str], Any] | None = None,
        owner_id: Any = None,
        policy_profile: Any = "balanced",
        required_layers: Any = None,
        scanner_allowlist: Any = None,
        enable_static_analysis: Any = True,
        enable_pickle_analysis: Any = True,
        enable_provenance_check: Any = False,
        enable_image_scan: Any = False,
        pickle_max_bytes: Any = DEFAULT_PICKLE_MAX_BYTES,
        provenance_verification_mode: Any = "bundle",
        provenance_bundle_source: Any = None,
        provenance_public_key_source: Any = None,
        provenance_signature_source: Any = None,
        certificate_identity: Any = None,
        certificate_oidc_issuer: Any = None,
        image_ref: Any = None,
        image_scanners: Any = None,
        image_severities: Any = None,
        image_ignore_unfixed: Any = False,
        image_skip_db_update: Any = False,
        max_bytes: Any = DEFAULT_MAX_BYTES,
        timeout_seconds: Any = DEFAULT_TIMEOUT_SECONDS,
        image_timeout_seconds: Any = DEFAULT_TIMEOUT_SECONDS,
    ) -> dict[str, Any]:
        operation_name = str(operation or "security_gate").strip().lower()
        if operation_name not in SUPPORTED_OPERATIONS:
            raise ValueError(
                f"Unsupported Model Security Gate operation: {operation_name}."
            )

        # The composite node can replace every legacy scanner node while still
        # keeping one execution surface.  security_gate runs Static model analysis and
        # any options selected in the form; the focused operations run only
        # their corresponding control.  A ZIP is passed to each enabled
        # adapter once; each adapter decides which entries belong to it.
        run_static_analysis = operation_name == "static_analysis" or (
            operation_name == "security_gate" and _as_bool(enable_static_analysis, True)
        )
        run_pickle_analysis = operation_name == "pickle_security" or (
            operation_name == "security_gate" and _as_bool(enable_pickle_analysis, True)
        )
        run_provenance_check = operation_name == "artifact_provenance" or (
            operation_name == "security_gate" and _as_bool(enable_provenance_check)
        )
        run_image_scan = operation_name == "container_image_scan" or (
            operation_name == "security_gate" and _as_bool(enable_image_scan)
        )

        layers: list[dict[str, Any]] = []
        if run_static_analysis or run_pickle_analysis or run_provenance_check:
            try:
                with stage_model_artifact(
                    artifact_value,
                    credential_lookup=credential_lookup,
                    owner_id=owner_id,
                    max_bytes=max_bytes,
                    timeout_seconds=timeout_seconds,
                    prefix="kai-model-security-gate-",
                ) as staged:
                    logger.info(
                        "Model security scan started: operation=%s name=%s format=%s size_bytes=%s",
                        operation_name,
                        staged.name,
                        staged.format,
                        staged.size_bytes,
                    )
                    if run_static_analysis:
                        try:
                            logger.info("Model security scan phase started: layer=static_analysis name=%s", staged.name)
                            static_analysis_result = self._static_analysis.scan_staged(
                                staged,
                                policy_profile="strict",
                                scanner_allowlist=scanner_allowlist,
                            )
                            static_analysis_layers = collect_layer_results(static_analysis_result)
                            if not static_analysis_layers:
                                raise ValueError("Static model analysis returned an invalid result contract.")
                            layers.append(static_analysis_layers[0])
                            logger.info(
                                "Model security scan phase completed: layer=static_analysis name=%s decision=%s",
                                staged.name,
                                static_analysis_layers[0].get("decision"),
                            )
                        except Exception as exc:
                            logger.error(
                                "Composite Static model analysis layer failed: error_type=%s",
                                type(exc).__name__,
                            )
                            layers.append(_error_layer("static_analysis", "Static model analysis"))

                    if run_pickle_analysis:
                        try:
                            logger.info("Model security scan phase started: layer=pickle_security name=%s", staged.name)
                            layers.append(
                                self._pickle_security.scan_staged(
                                    staged,
                                    max_bytes=pickle_max_bytes,
                                )
                            )
                            logger.info(
                                "Model security scan phase completed: layer=pickle_security name=%s decision=%s",
                                staged.name,
                                layers[-1].get("decision"),
                            )
                        except Exception as exc:
                            logger.error(
                                "Composite Pickle security analysis layer failed: error_type=%s",
                                type(exc).__name__,
                            )
                            layers.append(_error_layer("pickle_security", "Pickle security analysis"))

                    if run_provenance_check:
                        try:
                            layers.append(
                                self._provenance.verify_staged(
                                    staged,
                                    verification_mode=provenance_verification_mode,
                                    bundle_source=provenance_bundle_source,
                                    public_key_source=provenance_public_key_source,
                                    signature_source=provenance_signature_source,
                                    certificate_identity=certificate_identity,
                                    certificate_oidc_issuer=certificate_oidc_issuer,
                                    credential_lookup=credential_lookup,
                                    owner_id=owner_id,
                                )
                            )
                        except Exception as exc:
                            logger.error(
                                "Composite Artifact provenance layer failed: error_type=%s",
                                type(exc).__name__,
                            )
                            layers.append(_error_layer("artifact_provenance", "Artifact provenance"))
            except Exception as exc:
                logger.error(
                    "Composite model security staging failed: error_type=%s",
                    type(exc).__name__,
                )
                reason_codes = (
                    ["insufficient_disk_space"]
                    if isinstance(exc, ArtifactDiskSpaceError)
                    else ["artifact_staging_error"]
                )
                layer_id = (
                    "static_analysis"
                    if run_static_analysis
                    else "pickle_security"
                    if run_pickle_analysis
                    else "artifact_provenance"
                )
                engine_name = {
                    "static_analysis": "Static model analysis",
                    "pickle_security": "Pickle security analysis",
                    "artifact_provenance": "Artifact provenance",
                }[layer_id]
                layers.append(_error_layer(layer_id, engine_name, reason_codes))

        if run_image_scan:
            try:
                layers.append(
                    self._image_scan.scan_image(
                        image_ref,
                        scanners=image_scanners,
                        severities=image_severities,
                        ignore_unfixed=image_ignore_unfixed,
                        skip_db_update=image_skip_db_update,
                        timeout_seconds=image_timeout_seconds,
                    )
                )
            except Exception as exc:
                logger.error(
                    "Composite Container image scan layer failed: error_type=%s",
                    type(exc).__name__,
                )
                layers.append(_error_layer("container_image_scan", "Container image scan"))

        default_required_layer = {
            "security_gate": "static_analysis" if run_static_analysis else None,
            "static_analysis": "static_analysis",
            "pickle_security": "pickle_security",
            "artifact_provenance": "artifact_provenance",
            "container_image_scan": "container_image_scan",
        }[operation_name]
        effective_required = parse_layer_ids(
            required_layers,
            default=([default_required_layer] if default_required_layer else []),
        )
        if operation_name == "security_gate":
            enabled_layers = {
                layer_id
                for layer_id, enabled in (
                    ("static_analysis", run_static_analysis),
                    ("pickle_security", run_pickle_analysis),
                    ("artifact_provenance", run_provenance_check),
                    ("container_image_scan", run_image_scan),
                )
                if enabled
            }
            effective_required = [
                layer_id for layer_id in effective_required if layer_id in enabled_layers
            ]
        if str(policy_profile or "balanced").lower() == "strict":
            for layer_id, enabled in (
                ("pickle_security", run_pickle_analysis),
                ("artifact_provenance", run_provenance_check),
                ("container_image_scan", run_image_scan),
            ):
                if enabled and layer_id not in effective_required:
                    effective_required.append(layer_id)

        result = self._policy.evaluate(
            layers,
            profile=policy_profile,
            required_layers=effective_required,
        )
        return result


model_security_gate_service = ModelSecurityGateService()


__all__ = ["ModelSecurityGateService", "model_security_gate_service"]
