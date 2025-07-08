import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface LLMChainConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const LLMChainConfigModal = forwardRef<
  HTMLDialogElement,
  LLMChainConfigModalProps
>(({ nodeData, onSave }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [outputKey, setOutputKey] = useState(nodeData?.output_key || "output");

  const handleSave = () => {
    onSave({ output_key: outputKey });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure LLM Chain</h3>

        <div className="space-y-4 mt-4">
          <div>
            <label className="label">
              <span className="label-text">Output Key</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={outputKey}
              onChange={(e) => setOutputKey(e.target.value)}
              placeholder="output"
            />
          </div>
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

export default LLMChainConfigModal;
