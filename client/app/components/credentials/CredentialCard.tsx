import React, { useState } from "react";
import { Check, Loader2, Pencil, Trash, Zap, Link2, X as XIcon } from "lucide-react";
import { timeAgo } from "~/lib/dateFormatter";
import { resolveIconPath } from "~/lib/iconUtils";
import { getServiceDefinition } from "~/types/credentials";
import { getCredentialWorkflows } from "~/services/userCredentialService";
import type { CredentialWorkflowUsageResponse, UserCredential } from "~/types/api";
import CredentialWorkflowUsage from "./CredentialWorkflowUsage";

interface CredentialCardProps {
  credential: UserCredential;
  onEdit: (credential: UserCredential) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => Promise<{ success: boolean; message: string }>;
}

type TestState = "idle" | "loading" | "success" | "error";

const CredentialCard: React.FC<CredentialCardProps> = ({
  credential,
  onEdit,
  onDelete,
  onTest,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const serviceDefinition = getServiceDefinition(credential.service_type);
  const [iconFailed, setIconFailed] = useState(false);
  const [testState, setTestState] = useState<TestState>("idle");
  const [testMessage, setTestMessage] = useState<string>("");
  const [isUsageOpen, setIsUsageOpen] = useState(false);
  const [workflowUsage, setWorkflowUsage] = useState<CredentialWorkflowUsageResponse | null>(null);
  const [workflowUsageLoading, setWorkflowUsageLoading] = useState(false);
  const [workflowUsageError, setWorkflowUsageError] = useState<string | null>(null);
  const [hasLoadedUsage, setHasLoadedUsage] = useState(false);

  const loadUsageData = async () => {
    if (hasLoadedUsage) return;
    setWorkflowUsageLoading(true);
    setWorkflowUsageError(null);
    try {
      const usage = await getCredentialWorkflows(credential.id);
      setWorkflowUsage(usage);
      setHasLoadedUsage(true);
    } catch {
      setWorkflowUsage(null);
      setWorkflowUsageError("Could not load workflow usage.");
    } finally {
      setWorkflowUsageLoading(false);
    }
  };

  const handleToggleUsage = () => {
    const nextState = !isUsageOpen;
    setIsUsageOpen(nextState);
    if (nextState) {
      loadUsageData();
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
    loadUsageData();
  };

  const handleTest = async () => {
    setTestState("loading");
    setTestMessage("");
    try {
      const result = await onTest(credential.id);
      setTestState(result.success ? "success" : "error");
      setTestMessage(
        result.message ||
          (result.success
            ? "Connection successful."
            : "Connection failed. Please check your connection details.")
      );
    } catch {
      setTestState("error");
      setTestMessage("Connection failed. Please check your connection details.");
    }
    setTimeout(() => {
      setTestState("idle");
      setTestMessage("");
    }, 4000);
  };
  return (
    <div className="kai-credential-card rounded-lg border border-gray-200 bg-white p-4 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 flex items-center justify-center">
            {!iconFailed && (
              <img
                src={resolveIconPath(
                  serviceDefinition?.icon
                    ? `icons/${serviceDefinition.icon}`
                    : `icons/${credential.service_type}.svg`
                )}
                alt={`${serviceDefinition?.name || credential.service_type} logo`}
                className="w-6 h-6 object-contain"
                onError={() => setIconFailed(true)}
              />
            )}
            {iconFailed && (
              <div className="text-xl">{serviceDefinition?.icon || "🔑"}</div>
            )}
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 leading-tight">
              {credential.name}
            </h3>
            <p className="text-xs text-gray-500">
              {serviceDefinition?.name || credential.service_type}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${serviceDefinition?.color
              ? `bg-gradient-to-r ${serviceDefinition.color} text-white`
              : "bg-gray-100 text-gray-800"
              }`}
          >
            {serviceDefinition?.category === "ai"
              ? `${serviceDefinition?.name || credential.service_type} AI`
              : serviceDefinition?.category || credential.service_type}
          </span>
        </div>
      </div>

      {/* Metadata & Usage Trigger */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 mb-3">
        <span>Created: {timeAgo(credential.created_at)}</span>
        <span>·</span>
        <span>Updated: {timeAgo(credential.updated_at)}</span>
        <button
          type="button"
          onClick={handleToggleUsage}
          aria-expanded={isUsageOpen}
          className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kai-accent)]/45 ${isUsageOpen
            ? "border-[var(--kai-border-hover)] bg-[var(--kai-surface-hover-deep)] text-white"
            : "border-[var(--kai-border-muted)] bg-[var(--kai-surface-raised)] text-[var(--kai-text-soft)] hover:border-[var(--kai-border-hover)] hover:bg-[var(--kai-surface-hover-deep)] hover:text-white"
            }`}
        >
          {workflowUsageLoading ? (
            <Loader2 className="h-3 w-3 animate-spin text-[var(--kai-icon-muted)]" />
          ) : (
            <Link2 className="h-3 w-3 text-[var(--kai-icon-muted)]" />
          )}
          {workflowUsageLoading ? (
            <span>Loading...</span>
          ) : !hasLoadedUsage ? (
            <span>Show usage</span>
          ) : workflowUsage && workflowUsage.workflow_count > 0 ? (
            <span>
              Used in {workflowUsage.workflow_count} workflow
              {workflowUsage.workflow_count === 1 ? "" : "s"}
            </span>
          ) : (
            <span>Not used</span>
          )}
        </button>
      </div>

      {/* Test result message */}
      {testMessage && testState !== "loading" && (
        <p className={`text-xs mt-1 mb-1 ${testState === "success" ? "text-green-600" : "text-red-500"}`}>
          {testMessage}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={handleTest}
          disabled={testState === "loading"}
          className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors
            ${testState === "success" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" :
              testState === "error" ? "border-red-400/30 bg-red-400/10 text-red-300" :
                "border-[var(--kai-card-border)] bg-[var(--kai-surface-selected)] text-[var(--kai-control-accent-text)] hover:border-[var(--kai-accent)]/60 hover:bg-[var(--kai-accent)]/15 hover:text-white"}
            disabled:cursor-not-allowed disabled:opacity-50`}
          title="Test connection"
        >
          {testState === "loading" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {testState === "success" && <Check className="w-3.5 h-3.5" />}
          {testState === "error" && <XIcon className="w-3.5 h-3.5" />}
          {testState === "idle" && <Zap className="w-3.5 h-3.5" />}
          Test
        </button>

        <button
          onClick={() => onEdit(credential)}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--kai-card-border)] bg-[var(--kai-surface-selected)] text-[var(--kai-control-accent-text)] transition-colors hover:border-[var(--kai-accent)]/60 hover:bg-[var(--kai-accent)]/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--kai-accent)]"
          title="Edit credential"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleDeleteClick}
          className="kai-delete-trigger rounded-md p-1.5"
          title="Delete credential"
        >
          <Trash className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded workflow list (expands under the card actions) */}
      <CredentialWorkflowUsage
        usage={workflowUsage}
        isLoading={workflowUsageLoading}
        error={workflowUsageError}
        isOpen={isUsageOpen}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="delete-credential-title">
          <div className="w-full max-w-md rounded-xl border border-[var(--kai-border-dialog)] bg-[var(--kai-surface-dialog)] p-6 text-zinc-100 shadow-2xl shadow-black/50">
            <h3 id="delete-credential-title" className="mb-4 text-lg font-semibold text-white">Delete Credential</h3>
            
            {workflowUsageLoading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-zinc-400">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--kai-accent-text)]" />
                Checking workflow usage safety...
              </div>
            ) : workflowUsage && workflowUsage.workflow_count > 0 ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
                  <p className="font-semibold mb-1">
                    Warning: This credential is in use!
                  </p>
                  <p className="text-xs">
                    Deleting <strong>{credential.name}</strong> will break the configurations of <strong>{workflowUsage.workflow_count}</strong> active workflow{workflowUsage.workflow_count === 1 ? "" : "s"}. These workflows will fail during execution!
                  </p>
                </div>
                
                <div>
                  <h4 className="mb-2 text-xs font-semibold text-zinc-300">
                    Affected Workflows:
                  </h4>
                  <ul className="max-h-32 space-y-1.5 overflow-y-auto rounded-md border border-[var(--kai-border-dialog)] bg-[var(--kai-sidebar)] p-2 pr-1 text-xs scrollbar-thin">
                    {workflowUsage.workflows.map((workflow) => (
                      <li key={workflow.id} className="truncate font-medium text-zinc-200">
                        • {workflow.name}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <p className="text-xs text-zinc-400">
                  Are you absolutely sure you want to proceed? This action is highly disruptive and cannot be undone.
                </p>
              </div>
            ) : (
              <p className="mb-5 text-sm leading-6 text-zinc-300">
                Are you sure you want to delete <strong>{credential.name}</strong>? This action cannot be undone.
              </p>
            )}

            <div className="flex gap-2.5 justify-end mt-6">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="kai-secondary-action rounded-lg px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(credential.id);
                  setShowDeleteConfirm(false);
                }}
                className="kai-delete-confirm rounded-lg px-4 py-2 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CredentialCard;
