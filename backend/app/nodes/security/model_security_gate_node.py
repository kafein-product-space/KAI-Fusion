"""Low-noise composite node for layered model security."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any, Dict

from app.services.pickle_security_service import (
    DEFAULT_PICKLE_MAX_BYTES,
    PICKLE_ENGINE_VERSION,
)
from app.services.model_security_gate_service import (
    ModelSecurityGateService,
    model_security_gate_service,
)
from app.services.model_artifact_analysis_service import (
    DEFAULT_MAX_BYTES,
    DEFAULT_TIMEOUT_SECONDS,
    installed_static_analysis_version,
)
from app.services.security_audit_service import present_security_result
from app.services.container_image_scan_service import DEFAULT_IMAGE_SCAN_TIMEOUT_SECONDS

from ..base import (
    NodeInput,
    NodeOutput,
    NodePosition,
    NodeProperty,
    NodePropertyType,
    NodeType,
    ProcessorNode,
)


class ModelSecurityGateNode(ProcessorNode):
    """Expose Static model analysis plus optional layers behind one compact canvas node."""

    def __init__(self, service: ModelSecurityGateService | None = None):
        super().__init__()
        self._service = service or model_security_gate_service
        self._metadata = {
            "name": "ModelSecurityGate",
            "display_name": "Model Security Gate",
            "description": "Combines model artifact, signature/provenance, and serving-image checks into one security decision.",
            "category": "Security",
            "node_type": NodeType.PROCESSOR,
            "version": "1.0.0",
            "tags": ["security", "static_analysis", "pickle_security", "artifact_provenance", "container_image_scan", "gate"],
            "colors": ["amber-500", "red-700"],
            "icon": {"name": "model-security", "path": "icons/cryptography.svg", "alt": "Model Security Gate"},
            "inputs": [
                NodeInput(
                    name="trigger",
                    displayName="Trigger",
                    type="any",
                    description="Optional control-flow input; never interpreted as model content.",
                    is_connection=True,
                    required=False,
                    direction=NodePosition.LEFT,
                ),
            ],
            "outputs": [
                NodeOutput(
                    name="output",
                    displayName="Output",
                    type="Dict[str, Any]",
                    description="Security decision with scanner summaries, policy status, and actionable findings.",
                    format="json",
                    is_connection=True,
                    direction=NodePosition.RIGHT,
                ),
            ],
            "properties": self._properties(),
        }

    @staticmethod
    def _properties() -> list[NodeProperty]:
        return [
            NodeProperty(
                name="operation",
                displayName="Operation",
                type=NodePropertyType.SELECT,
                options=[
                    {
                        "label": "Full Scan",
                        "value": "security_gate",
                        "hint": "Run the enabled model scanners against one file or ZIP, plus the optional serving-image scan.",
                    },
                    {
                        "label": "Model Artifact Scan",
                        "value": "static_analysis",
                        "hint": "Run only the static model artifact scan.",
                    },
                    {
                        "label": "Pickle/PyTorch Deep Scan",
                        "value": "pickle_security",
                        "hint": "Run only the Pickle/PyTorch deep scan.",
                    },
                    {
                        "label": "Artifact Signature Verification",
                        "value": "artifact_provenance",
                        "hint": "Verify the model blob provenance and digest.",
                    },
                    {
                        "label": "Serving Image Risk Scan",
                        "value": "container_image_scan",
                        "hint": "Scan the serving image without staging a model artifact.",
                    },
                ],
                default="security_gate",
                description="Choose Full Scan to use one model file/ZIP source and toggle the scanners below.",
                required=True,
                tabName="basic",
            ),
            NodeProperty(
                name="artifact_source",
                displayName="Single Model File / ZIP",
                type=NodePropertyType.MODEL_ARTIFACT_SOURCE,
                default={"source_type": "local"},
                description="Local upload, backend path, or MinIO source. Local/path sources are scanned in place; stream-only sources are staged once.",
                required=True,
                displayOptions={
                    "show": {
                        "operation": ["security_gate", "static_analysis", "pickle_security", "artifact_provenance"]
                    }
                },
                tabName="basic",
            ),
            NodeProperty(
                name="policy_profile",
                displayName="Policy Profile",
                type=NodePropertyType.SELECT,
                options=[
                    {"label": "Balanced", "value": "balanced"},
                    {"label": "Strict (All Enabled Layers Required)", "value": "strict"},
                ],
                default="balanced",
                description="Strict treats every enabled applicable layer as required.",
                required=False,
                displayOptions={"show": {"operation": "security_gate"}},
                tabName="basic",
            ),
            NodeProperty(
                name="enable_static_analysis",
                displayName="Enable Static model analysis Scan",
                type=NodePropertyType.CHECKBOX,
                default=True,
                description="Routes every Static model analysis-supported file in the selected file or ZIP archive to Static model analysis.",
                required=False,
                displayOptions={"show": {"operation": "security_gate"}},
                tabName="basic",
            ),
            NodeProperty(
                name="enable_pickle_analysis",
                displayName="Enable Deep Pickle/PyTorch Scan",
                type=NodePropertyType.CHECKBOX,
                default=True,
                description="Runs only for Pickle/PyTorch-compatible formats; other formats are not applicable.",
                required=False,
                displayOptions={"show": {"operation": "security_gate"}},
                tabName="basic",
            ),
            NodeProperty(
                name="enable_provenance_check",
                displayName="Require Artifact Provenance Verification",
                type=NodePropertyType.CHECKBOX,
                default=False,
                description="Verifies the selected model blob/ZIP provenance. Artifact provenance is not an inner-file content scanner; configure its material in standalone Artifact provenance mode or reuse saved material.",
                required=False,
                displayOptions={"show": {"operation": "security_gate"}},
                tabName="basic",
            ),
            NodeProperty(
                name="provenance_verification_mode",
                displayName="Signature Verification Mode",
                type=NodePropertyType.SELECT,
                options=[
                    {"label": "Sigstore Bundle", "value": "bundle"},
                    {"label": "Public Key + Signature", "value": "public_key"},
                ],
                default="bundle",
                description="Verification material used when artifact signature verification is enabled.",
                required=False,
                displayOptions={
                    "show": {"operation": "artifact_provenance"}
                },
                tabName="basic",
            ),
            NodeProperty(
                name="provenance_bundle_source",
                displayName="Sigstore Bundle",
                type=NodePropertyType.MODEL_ARTIFACT_SOURCE,
                default={"source_type": "local"},
                description="Managed Sigstore bundle bound to the exact model blob.",
                required=False,
                displayOptions={
                    "show": {
                        "operation": "artifact_provenance",
                        "provenance_verification_mode": "bundle",
                    }
                },
                tabName="basic",
            ),
            NodeProperty(
                name="provenance_public_key_source",
                displayName="Public Verification Key",
                type=NodePropertyType.MODEL_ARTIFACT_SOURCE,
                default={"source_type": "local"},
                description="Managed public key for detached-signature verification.",
                required=False,
                displayOptions={
                    "show": {
                        "operation": "artifact_provenance",
                        "provenance_verification_mode": "public_key",
                    }
                },
                tabName="basic",
            ),
            NodeProperty(
                name="provenance_signature_source",
                displayName="Detached Signature",
                type=NodePropertyType.MODEL_ARTIFACT_SOURCE,
                default={"source_type": "local"},
                description="Managed signature corresponding to the exact model blob.",
                required=False,
                displayOptions={
                    "show": {
                        "operation": "artifact_provenance",
                        "provenance_verification_mode": "public_key",
                    }
                },
                tabName="basic",
            ),
            NodeProperty(
                name="enable_image_scan",
                displayName="Enable Serving Image Risk Scan",
                type=NodePropertyType.CHECKBOX,
                default=False,
                description="Scans the model-serving OCI image, not the raw model weights. Normalized Container image scan reports are capped at 16 MB.",
                required=False,
                displayOptions={"show": {"operation": "security_gate"}},
                tabName="basic",
            ),
            NodeProperty(
                name="image_ref",
                displayName="Serving Image Reference",
                type=NodePropertyType.TEXT,
                default="",
                placeholder="registry.example.com/team/model-server:1.0.0",
                description="OCI image reference used when serving image risk scanning is enabled.",
                required=False,
                displayOptions={
                    "show": {
                        "_any": {
                            "operation": ["security_gate", "container_image_scan"],
                            "enable_image_scan": True,
                        }
                    }
                },
                tabName="basic",
            ),
            NodeProperty(
                name="required_layers",
                displayName="Required Layers",
                type=NodePropertyType.JSON_EDITOR,
                default=["static_analysis"],
                description="Balanced profile layers that must be present and complete.",
                hint='Example: ["static_analysis", "artifact_provenance", "container_image_scan"]',
                required=False,
                displayOptions={"show": {"operation": "security_gate"}},
                tabName="advanced",
            ),
            NodeProperty(
                name="scanner_allowlist",
                displayName="Model Scanner Allowlist",
                type=NodePropertyType.JSON_EDITOR,
                default=[],
                description="Empty uses every applicable model scanner.",
                required=False,
                displayOptions={
                    "show": {"operation": ["security_gate", "static_analysis"]}
                },
                tabName="advanced",
            ),
            NodeProperty(
                name="pickle_max_bytes",
                displayName="Deep Analysis Maximum Artifact Size",
                type=NodePropertyType.NUMBER,
                default=DEFAULT_PICKLE_MAX_BYTES,
                min=1024 * 1024,
                max=2 * 1024 * 1024 * 1024,
                step=1024 * 1024,
                unit="MB",
                description="Independent in-memory analysis limit for applicable Pickle/PyTorch artifacts. Pickle security analysis supports up to 2 GB (2048 MB). Enter the value in MB.",
                required=False,
                displayOptions={
                    "show": {
                        "_any": {
                            "operation": ["security_gate", "pickle_security"],
                            "enable_pickle_analysis": True,
                        }
                    }
                },
                tabName="advanced",
            ),
            NodeProperty(
                name="certificate_identity",
                displayName="Expected Signing Identity",
                type=NodePropertyType.TEXT,
                default="",
                description="Required exact OIDC identity expected in a keyless signing certificate.",
                required=False,
                displayOptions={
                    "show": {
                        "operation": "artifact_provenance",
                        "provenance_verification_mode": "bundle",
                    }
                },
                tabName="advanced",
            ),
            NodeProperty(
                name="certificate_oidc_issuer",
                displayName="Expected Signing OIDC Issuer",
                type=NodePropertyType.TEXT,
                default="",
                description="Required HTTPS issuer expected in the signing certificate.",
                required=False,
                displayOptions={
                    "show": {
                        "operation": "artifact_provenance",
                        "provenance_verification_mode": "bundle",
                    }
                },
                tabName="advanced",
            ),
            NodeProperty(
                name="image_scanners",
                displayName="Image Scanner Types",
                type=NodePropertyType.JSON_EDITOR,
                default=["vuln", "secret", "misconfig", "license"],
                description="Image scanner families retained in the result.",
                required=False,
                displayOptions={
                    "show": {
                        "_any": {
                            "operation": ["security_gate", "container_image_scan"],
                            "enable_image_scan": True,
                        }
                    }
                },
                tabName="advanced",
            ),
            NodeProperty(
                name="image_severities",
                displayName="Image Severity Levels",
                type=NodePropertyType.JSON_EDITOR,
                default=["UNKNOWN", "LOW", "MEDIUM", "HIGH", "CRITICAL"],
                description="Severity levels included in the image scan.",
                required=False,
                displayOptions={
                    "show": {
                        "_any": {
                            "operation": ["security_gate", "container_image_scan"],
                            "enable_image_scan": True,
                        }
                    }
                },
                tabName="advanced",
            ),
            NodeProperty(
                name="image_ignore_unfixed",
                displayName="Ignore Unfixed Vulnerabilities",
                type=NodePropertyType.CHECKBOX,
                default=False,
                description="Exclude CVEs without a published fixed package version.",
                required=False,
                displayOptions={
                    "show": {
                        "_any": {
                            "operation": ["security_gate", "container_image_scan"],
                            "enable_image_scan": True,
                        }
                    }
                },
                tabName="advanced",
            ),
            NodeProperty(
                name="image_skip_db_update",
                displayName="Use Existing Local Databases",
                type=NodePropertyType.CHECKBOX,
                default=False,
                description="Disable image scanner database updates for controlled offline environments.",
                required=False,
                displayOptions={
                    "show": {
                        "_any": {
                            "operation": ["security_gate", "container_image_scan"],
                            "enable_image_scan": True,
                        }
                    }
                },
                tabName="advanced",
            ),
            NodeProperty(
                name="max_bytes",
                displayName="Maximum Artifact Size",
                type=NodePropertyType.NUMBER,
                default=DEFAULT_MAX_BYTES,
                min=1024 * 1024,
                max=8 * 1024 * 1024 * 1024,
                step=1024 * 1024,
                unit="MB",
                description="Hard limit for the model scan and ZIP expansion budget. The maximum model artifact size is 8 GB (8192 MB); Pickle security analysis supports up to 2 GB for Pickle/PyTorch artifacts. Enter the value in MB.",
                required=False,
                displayOptions={
                    "show": {
                        "operation": ["security_gate", "static_analysis", "artifact_provenance"]
                    }
                },
                tabName="advanced",
            ),
            NodeProperty(
                name="timeout_seconds",
                displayName="Model Controls Timeout",
                type=NodePropertyType.NUMBER,
                default=DEFAULT_TIMEOUT_SECONDS,
                min=1,
                max=3600,
                description="Shared deadline for staging and model security controls.",
                required=False,
                displayOptions={
                    "show": {
                        "operation": ["security_gate", "static_analysis", "pickle_security", "artifact_provenance"]
                    }
                },
                tabName="advanced",
            ),
            NodeProperty(
                name="image_timeout_seconds",
                displayName="Image Scan Timeout",
                type=NodePropertyType.NUMBER,
                default=DEFAULT_IMAGE_SCAN_TIMEOUT_SECONDS,
                min=1,
                max=1800,
                description="Independent registry and image-analysis deadline.",
                required=False,
                displayOptions={
                    "show": {
                        "_any": {
                            "operation": ["security_gate", "container_image_scan"],
                            "enable_image_scan": True,
                        }
                    }
                },
                tabName="advanced",
            ),
            NodeProperty(
                name="include_details",
                displayName="Include Diagnostic Details",
                type=NodePropertyType.CHECKBOX,
                default=False,
                description="Off (recommended) returns scanner/file summaries; on adds audit IDs, timestamps, hashes and individual check diagnostics.",
                required=False,
                tabName="advanced",
            ),
        ]

    def _setting(self, inputs: Mapping[str, Any], name: str, default: Any) -> Any:
        if inputs.get(name) not in (None, ""):
            return inputs[name]
        data = self.user_data if isinstance(self.user_data, dict) else {}
        return data.get(name, default)

    def execute(self, inputs: Dict[str, Any], connected_nodes: Dict[str, Any]) -> Dict[str, Any]:
        values = inputs or {}
        operation = self._setting(values, "operation", "security_gate")
        enable_static_analysis = self._setting(values, "enable_static_analysis", True)
        static_analysis_enabled = str(enable_static_analysis).strip().lower() not in {
            "false",
            "0",
            "no",
            "off",
        }
        default_required_layers = (
            ["static_analysis"]
            if operation == "security_gate" and static_analysis_enabled
            else []
            if operation == "security_gate"
            else [operation]
        )
        required_layers = (
            self._setting(values, "required_layers", default_required_layers)
            if operation == "security_gate"
            else default_required_layers
        )
        detailed_audit = self._service.scan(
            self._setting(values, "artifact_source", None),
            credential_lookup=self.get_credential,
            owner_id=getattr(self, "user_id", None),
            operation=operation,
            policy_profile=self._setting(values, "policy_profile", "balanced"),
            required_layers=required_layers,
            scanner_allowlist=self._setting(values, "scanner_allowlist", None),
            enable_static_analysis=enable_static_analysis,
            enable_pickle_analysis=self._setting(values, "enable_pickle_analysis", True),
            enable_provenance_check=self._setting(values, "enable_provenance_check", False),
            enable_image_scan=self._setting(values, "enable_image_scan", False),
            pickle_max_bytes=self._setting(
                values, "pickle_max_bytes", DEFAULT_PICKLE_MAX_BYTES
            ),
            provenance_verification_mode=self._setting(values, "provenance_verification_mode", "bundle"),
            provenance_bundle_source=self._setting(values, "provenance_bundle_source", None),
            provenance_public_key_source=self._setting(values, "provenance_public_key_source", None),
            provenance_signature_source=self._setting(values, "provenance_signature_source", None),
            certificate_identity=self._setting(values, "certificate_identity", None),
            certificate_oidc_issuer=self._setting(values, "certificate_oidc_issuer", None),
            image_ref=self._setting(values, "image_ref", None),
            image_scanners=self._setting(values, "image_scanners", None),
            image_severities=self._setting(values, "image_severities", None),
            image_ignore_unfixed=self._setting(values, "image_ignore_unfixed", False),
            image_skip_db_update=self._setting(
                values, "image_skip_db_update", False
            ),
            max_bytes=self._setting(values, "max_bytes", DEFAULT_MAX_BYTES),
            timeout_seconds=self._setting(values, "timeout_seconds", DEFAULT_TIMEOUT_SECONDS),
            image_timeout_seconds=self._setting(
                values, "image_timeout_seconds", DEFAULT_IMAGE_SCAN_TIMEOUT_SECONDS
            ),
        )
        audit = present_security_result(
            detailed_audit,
            include_details=self._setting(values, "include_details", False),
        )
        result = {
            "audit": audit,
            "should_continue": audit["should_continue"],
            "operation": operation,
        }
        audit_error = (
            audit.get("message")
            if str(audit.get("decision") or "").lower() == "error"
            else None
        )
        if audit_error:
            result.update(
                {
                    "success": False,
                    "status": "failed",
                    "error": audit_error,
                }
            )
        return {"output": result}

    def get_required_packages(self) -> list[str]:
        return [
            f"modelaudit=={installed_static_analysis_version()}",
            f"fickling=={PICKLE_ENGINE_VERSION}",
        ]


__all__ = ["ModelSecurityGateNode"]
