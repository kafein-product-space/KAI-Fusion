import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface SummaryMemoryConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const SummaryMemoryConfigModal = forwardRef<
  HTMLDialogElement,
  SummaryMemoryConfigModalProps
>(({ nodeData, onSave }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [memoryKey, setMemoryKey] = useState<string>(
    nodeData?.memory_key || "chat_history"
  );
  const [maxTokenLimit, setMaxTokenLimit] = useState<number>(
    nodeData?.max_token_limit || 2000
  );

  const handleSave = () => {
    onSave({
      memory_key: memoryKey,
      max_token_limit: Number(maxTokenLimit),
    });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Summary Memory</h3>

        <div className="space-y-4 mt-4">
          {/* memory_key */}
          <div>
            <label className="label">Memory Key</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={memoryKey}
              onChange={(e) => setMemoryKey(e.target.value)}
              placeholder="chat_history"
            />
          </div>

          {/* max_token_limit */}
          <div>
            <label className="label">Max Token Limit</label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={maxTokenLimit}
              min={100}
              max={8000}
              onChange={(e) => setMaxTokenLimit(parseInt(e.target.value, 10))}
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

export default SummaryMemoryConfigModal;
