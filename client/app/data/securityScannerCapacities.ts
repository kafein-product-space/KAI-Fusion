export type SecurityScannerCapacity = {
  id: string;
  name: string;
  scope: string;
  maxBytes: number | null;
  maxLabel: string;
  note: string;
};

export const SECURITY_SCANNER_CAPACITIES: SecurityScannerCapacity[] = [
  {
    id: "static_analysis",
    name: "Static model analysis",
    scope: "Model artifact",
    maxBytes: 8 * 1024 * 1024 * 1024,
    maxLabel: "8 GB",
    note: "Maximum streamed artifact size for static model analysis.",
  },
  {
    id: "pickle_security",
    name: "Pickle security analysis",
    scope: "Pickle/PyTorch artifact",
    maxBytes: 2 * 1024 * 1024 * 1024,
    maxLabel: "2 GB",
    note: "Hard ceiling for the isolated deep-analysis worker.",
  },
  {
    id: "artifact_provenance",
    name: "Artifact provenance",
    scope: "Signed model blob",
    maxBytes: 8 * 1024 * 1024 * 1024,
    maxLabel: "8 GB",
    note: "Verification material is limited separately to 8 MB per file.",
  },
  {
    id: "container_image_scan",
    name: "Container image scan",
    scope: "OCI serving image",
    maxBytes: null,
    maxLabel: "N/A",
    note: "Scans an OCI image reference, not a raw model file; normalized reports are capped at 16 MB.",
  },
];

const MODEL_ARTIFACT_CAPACITY = SECURITY_SCANNER_CAPACITIES[0];
const PICKLE_SECURITY_CAPACITY = SECURITY_SCANNER_CAPACITIES[1];
const PROVENANCE_MATERIAL_CAPACITY: SecurityScannerCapacity = {
  id: "artifact_provenance-material",
  name: "Artifact provenance",
  scope: "Signature verification material",
  maxBytes: 8 * 1024 * 1024,
  maxLabel: "8 MB",
  note: "Maximum size per bundle, public key, or detached signature file.",
};

const isProvenanceMaterial = (propertyName: string) =>
  propertyName !== "artifact_source" &&
  propertyName.endsWith("_source") &&
  ["bundle", "public_key", "signature"].some((part) => propertyName.includes(part));

export const getArtifactCapacity = (
  propertyName: string,
  nodeType?: string,
  values?: Record<string, any>,
): SecurityScannerCapacity => {
  if (isProvenanceMaterial(propertyName)) return PROVENANCE_MATERIAL_CAPACITY;

  const normalizedNodeType = String(nodeType || "").toLowerCase();
  const operation = String(values?.operation || "security_gate").toLowerCase();
  const gateRunsPickleAnalysis =
    operation === "pickle_security" ||
    (operation === "security_gate" && values?.enable_pickle_analysis !== false);
  if (normalizedNodeType.includes("pickle_security") ||
      (normalizedNodeType.includes("modelsecuritygate") && gateRunsPickleAnalysis)) {
    return PICKLE_SECURITY_CAPACITY;
  }

  return MODEL_ARTIFACT_CAPACITY;
};
