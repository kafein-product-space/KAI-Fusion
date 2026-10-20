import React from "react";
import { AlertTriangle, X } from "lucide-react";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Execution",
  message = "Are you sure you want to delete this execution? This action cannot be undone.",
  confirmText = "Delete",
  cancelText = "Cancel",
  isLoading = false
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[2px]" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="delete-confirmation-title" aria-describedby="delete-confirmation-message">
        <div className="w-full max-w-md overflow-hidden rounded-xl border border-[var(--kai-border-dialog)] bg-[var(--kai-surface-dialog)] text-zinc-100 shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--kai-border-dialog)] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-400/25 bg-red-400/10">
                <AlertTriangle className="h-5 w-5 text-red-300" />
              </div>
              <h3 id="delete-confirmation-title" className="text-lg font-semibold text-white">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-[var(--kai-surface-hover)] hover:text-white"
              disabled={isLoading}
              aria-label="Close delete confirmation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p id="delete-confirmation-message" className="text-sm leading-6 text-zinc-300">{message}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--kai-border-dialog)] bg-[var(--kai-sidebar)] p-4">
            <button
              onClick={onClose}
              className="rounded-lg border border-[var(--kai-border-strong)] bg-[var(--kai-surface-control)] px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-[var(--kai-surface-hover)]"
              disabled={isLoading}
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="rounded-lg border border-[var(--kai-danger-action)] bg-[var(--kai-danger-action)] px-4 py-2 text-sm font-medium text-white transition-colors hover:border-[var(--kai-danger-action-hover)] hover:bg-[var(--kai-danger-action-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Deleting..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
