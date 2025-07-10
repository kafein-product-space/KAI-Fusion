import { forwardRef, useImperativeHandle, useRef } from "react";

interface CalculatorConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const CalculatorConfigModal = forwardRef<
  HTMLDialogElement,
  CalculatorConfigModalProps
>(({ nodeData, onSave }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const handleSave = () => {
    onSave({}); // tool config gerektirmediği için boş obje döner
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Calculator Tool</h3>

        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-600">
            This tool evaluates basic mathematical expressions like:
            <br />
            <code className="bg-base-200 px-2 py-1 rounded text-xs font-mono">
              2 + 2, 5 * (3 + 1), 10 / 2, 3.14 * 2
            </code>
          </p>
          <p className="text-xs text-warning">
            ⚠️ Expressions with unsupported characters will be rejected.
          </p>
        </div>

        <div className="modal-action">
          <button
            className="btn btn-outline"
            onClick={() => dialogRef.current?.close()}
          >
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </dialog>
  );
});

export default CalculatorConfigModal;
