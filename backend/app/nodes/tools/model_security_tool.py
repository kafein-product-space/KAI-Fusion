"""One Agent tool for the complete model-security operation set."""

from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, ConfigDict, Field

from app.nodes.security.model_security_gate_node import ModelSecurityGateNode
from app.services.pickle_security_service import PICKLE_ENGINE_VERSION
from app.services.model_security_gate_service import (
    ModelSecurityGateService,
    model_security_gate_service,
)
from app.services.model_artifact_analysis_service import installed_static_analysis_version
from app.services.security_audit_service import present_security_result

from ..base import NodeOutput, NodePosition, NodeType, ProviderNode


class SecurityToolCallInput(BaseModel):
    """Agent-controlled presentation options; security targets stay node-bound."""

    model_config = ConfigDict(extra="forbid")

    include_findings: bool = Field(
        default=True,
        description="Include a bounded list of explainable findings in the tool response.",
    )
    max_findings: int = Field(
        default=3,
        ge=0,
        le=10,
        description="Maximum number of compact findings to return.",
    )


class ModelSecurityToolNode(ProviderNode):
    """Expose Static model analysis, Pickle security analysis, Artifact provenance, and Container image scan through one Agent tool."""

    def __init__(self, service: ModelSecurityGateService | None = None):
        super().__init__()
        self._service = service or model_security_gate_service
        self._metadata = {
            "name": "ModelSecurityTool",
            "display_name": "Model Security Tool",
            "description": (
                "One Agent function tool for Static model analysis, Pickle security analysis, Artifact provenance, Container image scan, and the complete model security gate."
            ),
            "category": "Tool",
            "node_type": NodeType.PROVIDER,
            "version": "1.0.0",
            "tags": ["tool", "security", "model", "artifact", "static_analysis", "pickle_security", "artifact_provenance", "container_image_scan"],
            "colors": ["amber-500", "red-700"],
            "icon": {
                "name": "model-security-tool",
                "path": "icons/cryptography.svg",
                "alt": "Model Security Tool",
            },
            "inputs": [],
            "outputs": [
                NodeOutput(
                    name="tool",
                    displayName="Model Security Tool",
                    type="BaseTool",
                    description="Connect this single security tool to the Agent node's tools input.",
                    is_connection=True,
                    direction=NodePosition.TOP,
                )
            ],
            "properties": ModelSecurityGateNode._properties(),
        }

    def execute(self, **kwargs: Any) -> Dict[str, Any]:
        user_data = self.user_data if isinstance(self.user_data, dict) else {}
        operation = str(user_data.get("operation") or "security_gate")
        artifact = user_data.get("artifact_source")
        # Keep this allowlist explicit: Agent arguments must never become scan configuration.
        values = {
            "operation": operation,
            "policy_profile": user_data.get("policy_profile", "balanced"),
            "required_layers": user_data.get("required_layers"),
            "scanner_allowlist": user_data.get("scanner_allowlist"),
            "enable_static_analysis": user_data.get("enable_static_analysis", True),
            "enable_pickle_analysis": user_data.get("enable_pickle_analysis", True),
            "enable_provenance_check": user_data.get("enable_provenance_check", False),
            "enable_image_scan": user_data.get("enable_image_scan", False),
            "pickle_max_bytes": user_data.get("pickle_max_bytes"),
            "provenance_verification_mode": user_data.get("provenance_verification_mode", "bundle"),
            "provenance_bundle_source": user_data.get("provenance_bundle_source"),
            "provenance_public_key_source": user_data.get("provenance_public_key_source"),
            "provenance_signature_source": user_data.get("provenance_signature_source"),
            "certificate_identity": user_data.get("certificate_identity"),
            "certificate_oidc_issuer": user_data.get("certificate_oidc_issuer"),
            "image_ref": user_data.get("image_ref"),
            "image_scanners": user_data.get("image_scanners"),
            "image_severities": user_data.get("image_severities"),
            "image_ignore_unfixed": user_data.get("image_ignore_unfixed", False),
            "image_skip_db_update": user_data.get("image_skip_db_update", False),
            "max_bytes": user_data.get("max_bytes"),
            "timeout_seconds": user_data.get("timeout_seconds"),
            "image_timeout_seconds": user_data.get("image_timeout_seconds"),
        }

        def scan_model_security(
            include_findings: bool = True,
            max_findings: int = 3,
        ) -> Dict[str, Any]:
            detailed = self._service.scan(
                artifact,
                credential_lookup=self.get_credential,
                owner_id=getattr(self, "user_id", None),
                **values,
            )
            compact = present_security_result(detailed, include_details=False)
            finding_limit = min(10, max(0, int(max_findings)))
            payload: dict[str, Any] = {
                "operation": values["operation"],
                "decision": compact.get("decision", "error"),
                "should_continue": compact.get("should_continue") is True,
                "message": compact.get("message", "Security scan failed closed."),
                "target": compact.get("target", {}),
                "summary": compact.get("summary", {}),
                "findings": (
                    deepcopy(compact.get("top_findings", [])[:finding_limit])
                    if include_findings
                    else []
                ),
                "safety_notice": "Static security analysis is not a definitive guarantee of runtime safety.",
            }
            for key in (
                "policy",
                "coverage",
                "layers",
                "scanners",
                "total_evaluation",
            ):
                if key in compact:
                    payload[key] = deepcopy(compact[key])
            if not include_findings and isinstance(payload.get("scanners"), dict):
                for scanner in payload["scanners"].values():
                    if not isinstance(scanner, dict):
                        continue
                    for file_result in scanner.get("files", []):
                        if isinstance(file_result, dict):
                            file_result["findings"] = []
            if not include_findings and isinstance(payload.get("total_evaluation"), dict):
                payload["total_evaluation"]["findings"] = []
            return payload

        tool = StructuredTool.from_function(
            name="scan_model_security",
            func=scan_model_security,
            description=(
                "Runs the configured Static model analysis, Pickle security analysis, Artifact provenance, Container image scan, or complete model-security operation. "
                "The target files, paths, image reference, and policy are bound to this node and cannot be replaced "
                "through the Agent call. ZIP sources return one compact JSON object grouped by scanner, with sequential per-file results."
            ),
            args_schema=SecurityToolCallInput,
        )
        return {"tool": {"tool": tool}}

    def get_required_packages(self) -> list[str]:
        return [
            f"modelaudit=={installed_static_analysis_version()}",
            f"fickling=={PICKLE_ENGINE_VERSION}",
        ]


__all__ = ["ModelSecurityToolNode"]
