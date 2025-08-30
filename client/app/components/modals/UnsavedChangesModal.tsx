import { forwardRef, useImperativeHandle, useRef } from "react";

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

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box bg-gray-900 border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-yellow-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">Unsaved Changes</h3>
            <p className="text-sm text-gray-400">
              Your changes have not been saved
            </p>
          </div>
        </div>

        <p className="text-gray-300 mb-6">
          Do you want to save your changes before leaving this page?
        </p>

        <div className="modal-action gap-2">
          <button
            className="btn btn-outline btn-sm text-gray-400 border-gray-600 hover:bg-gray-800 hover:text-white"
            onClick={() => {
              onCancel();
              dialogRef.current?.close();
            }}
          >
            Cancel
          </button>
          <button
            className="btn btn-outline btn-sm text-red-400 border-red-600 hover:bg-red-900/20 hover:text-red-300"
            onClick={() => {
              onDiscard();
              dialogRef.current?.close();
            }}
          >
            Discard Changes
          </button>
          <button
            className="btn btn-primary btn-sm bg-blue-600 hover:bg-blue-700 text-white"
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
