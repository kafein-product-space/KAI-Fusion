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

  const [initialInput, setInitialInput] = useState(
    nodeData?.initial_input || ""
  );

  const handleSave = () => {
    onSave({ initial_input: initialInput });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Start Node</h3>

        <div className="mt-4">
          <label className="label">
            <span className="label-text">Initial Input</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={initialInput}
            onChange={(e) => setInitialInput(e.target.value)}
            placeholder="Enter initial input for the workflow"
          />
        </div>

        <div className="modal-action">
          <button
            className="btn btn-outline"
            onClick={() => dialogRef.current?.close()}
          >
            Cancel
          </button>
          <button className="btn btn-success" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </dialog>
  );
});

export default StartNodeConfigModal;
