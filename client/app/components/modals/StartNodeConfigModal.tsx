import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface StartNodeConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const StartNodeConfigModal = forwardRef<
  HTMLDialogElement,
  StartNodeConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  // input ile ilgili state ve fonksiyonlar kaldırıldı

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Start Node</h3>
        <div className="modal-action">
          <button
            className="btn btn-outline"
            onClick={() => dialogRef.current?.close()}
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
});

export default StartNodeConfigModal;
