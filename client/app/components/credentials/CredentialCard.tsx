import React, { useState } from "react";
import { Pencil, Trash, Eye, EyeOff, Copy, Check } from "lucide-react";
import { timeAgo } from "~/lib/dateFormatter";
import { getServiceDefinition } from "~/types/credentials";
import type { UserCredential } from "~/types/api";

interface CredentialCardProps {
  credential: UserCredential;
  onEdit: (credential: UserCredential) => void;
  onDelete: (id: string) => void;
  onViewSecret: (id: string) => Promise<string>;
}

const CredentialCard: React.FC<CredentialCardProps> = ({
  credential,
  onEdit,
  onDelete,
  onViewSecret,
}) => {
  const [isSecretVisible, setIsSecretVisible] = useState(false);
  const [secretValue, setSecretValue] = useState<string>("");
  const [isLoadingSecret, setIsLoadingSecret] = useState(false);
  const [copiedField, setCopiedField] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const serviceDefinition = getServiceDefinition(credential.service_type);
  const [iconFailed, setIconFailed] = useState(false);

  const handleViewSecret = async () => {
    if (!isSecretVisible && !secretValue) {
      setIsLoadingSecret(true);
      try {
        const secret = await onViewSecret(credential.id);
        setSecretValue(secret);
        setIsSecretVisible(true);
      } catch (error) {
        console.error("Failed to load secret:", error);
      } finally {
        setIsLoadingSecret(false);
      }
    } else {
      setIsSecretVisible(!isSecretVisible);
    }
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(""), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const getSecretDisplayValue = () => {
    if (!secretValue) return "";

    try {
      const secretData = JSON.parse(secretValue);
      if (typeof secretData === "object") {
        // Show first few characters of the first field
        const firstField = Object.values(secretData)[0];
        if (typeof firstField === "string") {
          return firstField.length > 20
            ? `${firstField.substring(0, 20)}...`
            : firstField;
        }
      }
      return secretValue.length > 20
        ? `${secretValue.substring(0, 20)}...`
        : secretValue;
    } catch {
      return secretValue.length > 20
        ? `${secretValue.substring(0, 20)}...`
        : secretValue;
    }
  };

  const renderSecretFields = () => {
    if (!secretValue) return null;

    try {
      const secretData = JSON.parse(secretValue);
      if (typeof secretData === "object") {
        return Object.entries(secretData).map(([key, value]) => (
          <div
            key={key}
            className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
          >
            <span className="text-sm font-medium text-gray-700 capitalize">
              {key.replace(/_/g, " ")}:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-900 font-mono">
                {typeof value === "string" && value.length > 30
                  ? `${value.substring(0, 30)}...`
                  : String(value)}
              </span>
              <button
                onClick={() => copyToClipboard(String(value), key)}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Copy to clipboard"
              >
                {copiedField === key ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        ));
      }
      return null;
    } catch {
      return null;
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
                src={`/icons/${credential.service_type}.svg`}
                alt={`${
                  serviceDefinition?.name || credential.service_type
                } logo`}
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
            className={`inline-flex px-2.5 py-0.5 text-[10px] font-semibold rounded-full ${
              serviceDefinition?.color
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

      {/* Secret Section */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-700">Credentials</span>
          <button
            onClick={handleViewSecret}
            disabled={isLoadingSecret}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {isLoadingSecret ? (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : isSecretVisible ? (
              <>
                <EyeOff className="w-4 h-4" />
                Hide
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                View
              </>
            )}
          </button>
        </div>

        {isSecretVisible && (
          <div className="bg-gray-50 rounded-md p-2.5">
            {renderSecretFields() || (
              <div className="text-xs text-gray-600">
                {getSecretDisplayValue()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
        <span>Created: {timeAgo(credential.created_at)}</span>
        <span>Updated: {timeAgo(credential.updated_at)}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={() => onEdit(credential)}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all duration-200"
          title="Edit credential"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-200"
          title="Delete credential"
        >
          <Trash className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-5 max-w-sm mx-4">
            <h3 className="text-base font-bold mb-3">Delete Credential</h3>
            <p className="text-gray-600 mb-5 text-sm">
              Are you sure you want to delete <strong>{credential.name}</strong>
              ? This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(credential.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
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
