import React, { useState } from "react";
import { Check, Loader2, Pencil, Trash, Zap, Link2, LogIn, Unlink, X as XIcon } from "lucide-react";
import { timeAgo } from "~/lib/dateFormatter";
import { resolveIconPath } from "~/lib/iconUtils";
import { apiClient } from "~/lib/api-client";
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

// Services whose credential holds tokens issued by Google rather than
// anything a form could ask for.
const GOOGLE_SERVICES = [
  "gmail",
  "gmail_readonly",
  "google_drive",
  "google_sheets",
  "google_calendar",
];

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

  const isGoogleService = GOOGLE_SERVICES.includes(credential.service_type);
  const [connecting, setConnecting] = useState(false);
  const [connectMessage, setConnectMessage] = useState<string>("");

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
      setTestMessage(result.message);
    } catch {
      setTestState("error");
      setTestMessage("Unexpected error. Please try again.");
    }
    setTimeout(() => {
      setTestState("idle");
      setTestMessage("");
    }, 4000);
  };

  /**
   * Send the account owner to Google and wait for word back.
   *
   * The consent screen opens in a window of its own, so the page behind it
   * keeps its state. That window tells this one how it went before closing
   * itself, which is what the message listener is for.
   */
  const handleConnectGoogle = async () => {
    setConnecting(true);
    setConnectMessage("");

    try {
      const response: any = await apiClient.get(
        `/credentials/${credential.id}/google/authorize`
      );
      const url = response?.authorization_url;

      if (!url) {
        setConnectMessage("The server did not say where to send you.");
        setConnecting(false);
        return;
      }

      const popup = window.open(
        url,
        "google-oauth",
        "width=520,height=640,menubar=no,toolbar=no"
      );

      if (!popup) {
        setConnectMessage(
          "The browser blocked the window. Allow popups for this site and try again."
        );
        setConnecting(false);
        return;
      }

      const onMessage = (event: MessageEvent) => {
        if (event.data?.source !== "google-oauth") return;

        window.removeEventListener("message", onMessage);
        clearInterval(watcher);
        setConnecting(false);
        setConnectMessage(
          event.data.success
            ? "The account is connected. Use Test to see which one."
            : "The account was not connected."
        );
      };
      window.addEventListener("message", onMessage);

      // A window closed by hand sends nothing, so it is watched as well.
      const watcher = setInterval(() => {
        if (popup.closed) {
          clearInterval(watcher);
          window.removeEventListener("message", onMessage);
          setConnecting(false);
        }
      }, 500);
    } catch (error: any) {
      setConnecting(false);
      setConnectMessage(error?.message ?? "The connection could not be started.");
    }
  };

  /** Drop the connection, at Google as well as here. */
  const handleDisconnectGoogle = async () => {
    setConnecting(true);
    setConnectMessage("");

    try {
      await apiClient.delete(`/credentials/${credential.id}/google/disconnect`);
      setConnectMessage("The account is no longer connected.");
    } catch (error: any) {
      setConnectMessage(error?.message ?? "The account could not be disconnected.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-all duration-200">
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
        <span>·</span>
        <button
          type="button"
          onClick={handleToggleUsage}
          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors cursor-pointer"
        >
          {workflowUsageLoading ? (
            <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          ) : (
            <Link2 className="w-3 h-3" />
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

      {/* Google connection message */}
      {connectMessage && (
        <p className="text-xs mt-1 mb-1 text-gray-600">{connectMessage}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-1.5">
        {isGoogleService && (
          <>
            <button
              onClick={handleConnectGoogle}
              disabled={connecting}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-md text-gray-400
                         hover:text-blue-600 hover:bg-blue-50 transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed"
              title="Connect a Google account"
            >
              {connecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogIn className="w-3.5 h-3.5" />
              )}
              Connect
            </button>

            <button
              onClick={handleDisconnectGoogle}
              disabled={connecting}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md
                         transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Disconnect the Google account"
            >
              <Unlink className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        <button
          onClick={handleTest}
          disabled={testState === "loading"}
          className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-all duration-200
            ${testState === "success" ? "text-green-600 bg-green-50" :
              testState === "error" ? "text-red-500 bg-red-50" :
                "text-gray-400 hover:text-blue-600 hover:bg-blue-50"}
            disabled:opacity-50 disabled:cursor-not-allowed`}
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
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-200"
          title="Edit credential"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleDeleteClick}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-200"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-3 text-red-600">Delete Credential</h3>

            {workflowUsageLoading ? (
              <div className="flex items-center gap-2 py-4 justify-center text-sm text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                Checking workflow usage safety...
              </div>
            ) : workflowUsage && workflowUsage.workflow_count > 0 ? (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                  <p className="font-semibold mb-1">
                    Warning: This credential is in use!
                  </p>
                  <p className="text-xs">
                    Deleting <strong>{credential.name}</strong> will break the configurations of <strong>{workflowUsage.workflow_count}</strong> active workflow{workflowUsage.workflow_count === 1 ? "" : "s"}. These workflows will fail during execution!
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                    Affected Workflows:
                  </h4>
                  <ul className="space-y-1.5 max-h-32 overflow-y-auto pr-1 border border-gray-200 rounded-md p-2 bg-gray-50 scrollbar-thin text-xs">
                    {workflowUsage.workflows.map((workflow) => (
                      <li key={workflow.id} className="text-gray-700 font-medium truncate">
                        • {workflow.name}
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="text-xs text-gray-500">
                  Are you absolutely sure you want to proceed? This action is highly disruptive and cannot be undone.
                </p>
              </div>
            ) : (
              <p className="text-gray-600 mb-5 text-sm">
                Are you sure you want to delete <strong>{credential.name}</strong>? This action cannot be undone.
              </p>
            )}

            <div className="flex gap-2.5 justify-end mt-6">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(credential.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-all duration-200 shadow-sm hover:shadow"
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