import { forwardRef, useImperativeHandle, useRef } from "react";
import { AlertTriangle } from "lucide-react";

interface UnsavedChangesModalProps {
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

const UnsavedChangesModal = forwardRef<
  HTMLDialogElement,
  UnsavedChangesModalProps
>(({ onSave, onDiscard, onCancel }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const closeAsCancel = () => {
    onCancel();
    dialogRef.current?.close();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="unsaved-changes-title"
      aria-describedby="unsaved-changes-description"
      onCancel={(event) => {
        event.preventDefault();
        closeAsCancel();
      }}
      className="fixed inset-0 m-auto h-fit w-[calc(100%_-_2rem)] max-w-lg overflow-visible bg-transparent p-0 text-left text-white backdrop:bg-black/65 backdrop:backdrop-blur-[2px]"
    >
      <div className="overflow-hidden rounded-xl border border-[var(--kai-border-dialog)] bg-[var(--kai-surface-dialog)] shadow-2xl shadow-black/50">
        <div className="flex items-start gap-3 px-6 pt-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/10">
            <AlertTriangle className="h-5 w-5 text-amber-300" aria-hidden="true" />
          </div>
          <div>
            <h3 id="unsaved-changes-title" className="text-lg font-semibold text-white">
              Unsaved Changes
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              Your latest workflow changes have not been saved.
            </p>
          </div>
        </div>

        <p id="unsaved-changes-description" className="px-6 pb-6 pt-4 text-sm leading-6 text-zinc-300">
          Do you want to save your changes before leaving this page?
        </p>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--kai-border-dialog)] bg-[var(--kai-sidebar)] px-6 py-4">
          <button
            type="button"
            className="rounded-lg border border-[var(--kai-border-strong)] bg-[var(--kai-surface-control)] px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-[var(--kai-surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kai-accent-text)]"
            onClick={closeAsCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg border border-red-400/35 px-4 py-2 text-sm font-medium text-red-300 transition-colors hover:border-red-400/60 hover:bg-red-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
            onClick={() => {
              onDiscard();
              dialogRef.current?.close();
            }}
          >
            Discard Changes
          </button>
          <button
            type="button"
            className="rounded-lg border border-[var(--kai-accent)] bg-[var(--kai-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:border-[var(--kai-accent-hover)] hover:bg-[var(--kai-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--kai-accent-text)]"
            onClick={() => {
              onSave();
              dialogRef.current?.close();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </dialog>
  );
});

UnsavedChangesModal.displayName = "UnsavedChangesModal";

export default UnsavedChangesModal;
