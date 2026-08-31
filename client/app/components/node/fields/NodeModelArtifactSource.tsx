import { useEffect, useRef, useState } from "react";
import { Database, FileUp, FolderOpen, Loader2, X } from "lucide-react";

import CredentialSelector from "../../credentials/CredentialSelector";
import { apiClient } from "~/lib/api-client";
import { API_ENDPOINTS } from "~/lib/config";
import { getArtifactCapacity } from "~/data/securityScannerCapacities";
import type { NodeProperty } from "../types";
import { FieldLabel, getFieldHelpText } from "./FieldLabel";


interface NodeModelArtifactSourceProps {
  property: NodeProperty;
  values: any;
  setFieldValue: (name: string, value: any) => void;
  nodeType?: string;
}

type SourceMode = "local" | "minio";

const ACCEPTED_PROVENANCE_BUNDLE_FILES = [
  ".json", ".bundle", ".sigstore", "application/json",
].join(",");
const ACCEPTED_PROVENANCE_PUBLIC_KEY_FILES = [
  ".key", ".pub", ".pem", ".crt", "application/x-pem-file", "text/plain",
].join(",");
const ACCEPTED_PROVENANCE_SIGNATURE_FILES = [
  ".sig", ".signature", ".sigstore", ".txt", "text/plain", "application/octet-stream",
].join(",");
function acceptedFilesForProperty(propertyName: string): string {
  if (propertyName === "bundle_source" || propertyName === "provenance_bundle_source") {
    return ACCEPTED_PROVENANCE_BUNDLE_FILES;
  }
  if (propertyName === "public_key_source" || propertyName === "provenance_public_key_source") {
    return ACCEPTED_PROVENANCE_PUBLIC_KEY_FILES;
  }
  if (propertyName === "signature_source" || propertyName === "provenance_signature_source") {
    return ACCEPTED_PROVENANCE_SIGNATURE_FILES;
  }
  return "";
}

function isProvenanceMaterialProperty(propertyName: string): boolean {
  return propertyName !== "artifact_source" && propertyName.endsWith("_source") && (
    propertyName.includes("bundle") ||
    propertyName.includes("public_key") ||
    propertyName.includes("signature")
  );
}

const inputClass =
  "w-full rounded-lg border border-slate-600 bg-[#10182c] px-4 py-3 text-sm text-white " +
  "placeholder:text-slate-500 focus:border-blue-500 focus:outline-none";

function formatBytes(value: number | undefined): string {
  if (!value || value < 1) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const amount = value / 1024 ** index;
  return `${amount.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export function NodeModelArtifactSource({
  property,
  values,
  setFieldValue,
  nodeType,
}: NodeModelArtifactSourceProps) {
  const rawValue = values[property.name] || { source_type: "local" };
  const isLegacyMinio =
    rawValue.source_type === "cloud" && rawValue.cloud_provider === "minio";
  const value = isLegacyMinio
    ? { ...rawValue, source_type: "minio", storage: "minio" }
    : rawValue;
  const sourceMode: SourceMode = value.source_type === "minio" ? "minio" : "local";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProvenanceMaterial = isProvenanceMaterialProperty(property.name);
  const capacity = getArtifactCapacity(property.name, nodeType, values);
  const maxLocalUploadBytes = capacity.maxBytes ?? 8 * 1024 * 1024 * 1024;
  const [modelAcceptedFiles, setModelAcceptedFiles] = useState("");
  const [staticAnalysisVersion, setStaticAnalysisVersion] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [pathOpen, setPathOpen] = useState(Boolean(value.path));
  const [pathDraft, setPathDraft] = useState(value.path || "");

  const acceptedFiles = isProvenanceMaterial
    ? acceptedFilesForProperty(property.name)
    : modelAcceptedFiles;

  useEffect(() => {
    if (isProvenanceMaterial) return;
    let active = true;
    apiClient
      .get<{ extensions?: string[]; version?: string }>(
        API_ENDPOINTS.MODEL_ARTIFACTS.CAPABILITIES,
      )
      .then((capabilities) => {
        if (!active) return;
        const extensions = new Set(
          (capabilities.extensions || []).filter(
            (extension): extension is string =>
              typeof extension === "string" && extension.startsWith("."),
          ),
        );
        // ZIP is the batch container supported by KAI-Flow even when a
        // Static model analysis release does not list the container in its registry.
        extensions.add(".zip");
        setModelAcceptedFiles(
          Array.from(extensions).sort().join(","),
        );
        setStaticAnalysisVersion(capabilities.version || "");
      })
      .catch(() => {
        // The backend remains authoritative when the capability request fails.
      });
    return () => {
      active = false;
    };
  }, [isProvenanceMaterial]);

  useEffect(() => {
    if (value.source_type === "path") {
      setPathOpen(true);
      setPathDraft(value.path || "");
      return;
    }
    setPathOpen(false);
    setPathDraft("");
  }, [value.source_type, value.path]);

  const setSource = (next: Record<string, any>) => {
    setFieldValue(property.name, next);
    setFieldValue("credential_id", next.credential_id || "");
  };

  const changeMode = (mode: SourceMode) => {
    setUploadError("");
    setPathOpen(false);
    setPathDraft("");
    if (mode === "local") {
      setSource({ source_type: "local", storage: "managed" });
    } else {
      setSource({
        source_type: "minio",
        storage: "minio",
        credential_id: "",
        bucket: "",
        object_key: "",
      });
    }
  };

  const closePathEditor = () => {
    setUploadError("");
    setPathOpen(false);
    setPathDraft("");
    if (value.source_type === "path") {
      setSource({ source_type: "local", storage: "managed" });
    }
  };

  const updateValue = (patch: Record<string, any>) => {
    setSource({ ...value, ...patch });
  };

  const applyPath = () => {
    const path = pathDraft.trim();
    if (!path) {
      setUploadError("Enter an absolute path on the backend/scanner host.");
      return;
    }
    setUploadError("");
    setSource({ source_type: "path", storage: "local_path", path });
  };

  const uploadFile = async (file: File | undefined) => {
    if (!file) return;
    if (capacity.maxBytes !== null && file.size > maxLocalUploadBytes) {
      setUploadError(
        `This file is ${formatBytes(file.size)}. The maximum supported size for ${capacity.name} is ${capacity.maxLabel}. ` +
        "This scanner cannot process files above that limit.",
      );
      return;
    }
    setUploading(true);
    setUploadError("");
    setUploadProgress(0);
    setUploadStatus("Preparing one-time transfer…");
    const form = new FormData();
    form.append("file", file);
    try {
      const artifact = await apiClient.post<Record<string, any>>(
        API_ENDPOINTS.MODEL_ARTIFACTS.UPLOAD,
        form,
        {
          timeout: 60 * 60 * 1000,
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (event: { loaded: number; total?: number }) => {
            if (!event.total) {
              setUploadStatus("Sending file once to scan service…");
              return;
            }
            const progress = Math.min(100, Math.round((event.loaded / event.total) * 100));
            setUploadProgress(progress);
            setUploadStatus(
              progress >= 100
                ? "Saving the one uploaded file for direct scan…"
                : `Sending file once to scan service… ${progress}%`,
            );
          },
        },
      );
      setSource({ source_type: "local", ...artifact });
    } catch (error: any) {
      setUploadError(error?.message || "Model artifact upload failed.");
    } finally {
      setUploading(false);
      setUploadStatus("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const modes: Array<{ id: SourceMode; label: string; icon: typeof FileUp }> = [
    { id: "local", label: "Local", icon: FileUp },
    { id: "minio", label: "MinIO", icon: Database },
  ];

  return (
    <div className="col-span-2 space-y-4">
      <FieldLabel
        label={property.displayName}
        helpText={getFieldHelpText(property)}
      />

      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-700 bg-slate-900/70 p-1">
        {modes.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => changeMode(id)}
            className={`flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-xs font-semibold transition-colors ${
              sourceMode === id
                ? "bg-orange-500 text-white shadow"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {sourceMode === "local" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-300">Local file or ZIP archive</span>
            <button
              type="button"
              onClick={() => {
                setPathOpen(true);
                setPathDraft(value.path || "");
                setUploadError("");
              }}
              className="flex items-center gap-1.5 rounded-md border border-slate-600 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-orange-400 hover:text-white"
              title="Use a path on the backend/scanner host"
            >
              <FolderOpen size={14} />
              Path
            </button>
          </div>
          {pathOpen || value.source_type === "path" ? (
            <div className="space-y-2 rounded-xl border border-orange-500/50 bg-orange-500/5 p-3">
              <div className="flex items-center gap-2">
                <input
                  className={inputClass}
                  value={pathDraft}
                  onChange={(event) => setPathDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyPath();
                    }
                  }}
                  placeholder="/data/models/model.zip"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={applyPath}
                  className="shrink-0 rounded-lg bg-orange-500 px-3 py-2.5 text-xs font-semibold text-white hover:bg-orange-400"
                >
                  Use
                </button>
                <button
                  type="button"
                  onClick={closePathEditor}
                  className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                  title="Close path input"
                >
                  <X size={17} />
                </button>
              </div>
              <p className="text-xs text-slate-500">
                This is a path on the backend/scanner host. The file is scanned in place; it is not copied to a temporary folder.
              </p>
            </div>
          ) : value.artifact_id ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-700/60 bg-emerald-950/30 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-emerald-200">{value.name}</p>
                <p className="mt-1 text-xs text-emerald-400/80">
                  {formatBytes(value.size_bytes)} · uploaded once · ready for direct scan
                </p>
              </div>
              <button
                type="button"
                onClick={() => changeMode("local")}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                title="Clear selection"
              >
                <X size={17} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                uploadFile(event.dataTransfer.files?.[0]);
              }}
              className="flex min-h-36 w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-orange-500/70 bg-orange-500/5 px-6 py-7 text-center transition-colors hover:bg-orange-500/10 disabled:cursor-wait disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="animate-spin text-orange-400" size={28} />
              ) : (
                <FileUp className="text-orange-400" size={28} />
              )}
              <span className="text-sm font-semibold text-slate-100">
                {uploading
                  ? "Sending file once to scan service…"
                  : `${isProvenanceMaterial ? "Select a verification material file or drop it here" : "Select a model file or drop it here"}`}
              </span>
              <span className="text-xs text-slate-500">
                {isProvenanceMaterial
                  ? "Sigstore bundle (JSON), public key (KEY/PUB/PEM), or detached signature (SIG)"
                  : `Static model analysis ${staticAnalysisVersion ? `v${staticAnalysisVersion}` : "runtime"} supported files and ZIP archives`}
              </span>
            </button>
          )}
          {uploading && (
            <div className="rounded-xl border border-blue-700/60 bg-blue-950/30 p-3">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                <span className="text-blue-200">{uploadStatus}</span>
                <span className="font-semibold text-blue-300">{uploadProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-blue-500 transition-[width] duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFiles}
            className="hidden"
            onChange={(event) => uploadFile(event.target.files?.[0])}
          />
          {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
          <p className="text-xs text-slate-500">
            Scanner capacity: {capacity.maxLabel}. Browser files are transferred to the scan service once, then scanned from that same managed file; no second upload or workflow-JSON copy is created.
          </p>
        </div>
      )}

      {sourceMode === "minio" && (
        <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300">MinIO credential</label>
            <CredentialSelector
              value={value.credential_id || ""}
              onChange={(credentialId) => updateValue({ credential_id: credentialId })}
              serviceType="minio"
              placeholder="Select a MinIO credential"
              showCreateNew
              includeGenericFallback={false}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">Bucket</label>
              <input
                className={inputClass}
                value={value.bucket || ""}
                onChange={(event) => updateValue({ bucket: event.target.value })}
                placeholder="models"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300">Object key</label>
              <input
                className={inputClass}
                value={value.object_key || ""}
                onChange={(event) => updateValue({ object_key: event.target.value })}
                placeholder="incoming/model.gguf"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Credential secrets are never written to workflow JSON; only the credential ID is stored. Scanner capacity: {capacity.maxLabel}.
          </p>
        </div>
      )}
    </div>
  );
}
