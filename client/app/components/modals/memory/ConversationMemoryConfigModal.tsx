import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface ConversationMemoryConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const ConversationMemoryConfigModal = forwardRef<
  HTMLDialogElement,
  ConversationMemoryConfigModalProps
>(({ nodeData, onSave }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [k, setK] = useState<number>(nodeData?.k ?? 5);
  const [memoryKey, setMemoryKey] = useState<string>(
    nodeData?.memory_key || "chat_history"
  );

  const handleSave = () => {
    onSave({
      k: Number(k),
      memory_key: memoryKey,
    });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Conversation Memory</h3>

        <div className="space-y-4 mt-4">
          {/* k */}
          <div>
            <label className="label">Window Size (k)</label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={k}
              min={1}
              onChange={(e) => setK(parseInt(e.target.value, 10))}
            />
          </div>

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

export default ConversationMemoryConfigModal;
