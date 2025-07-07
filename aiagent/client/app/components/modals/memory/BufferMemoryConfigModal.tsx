import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface BufferMemoryConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const BufferMemoryConfigModal = forwardRef<
  HTMLDialogElement,
  BufferMemoryConfigModalProps
>(({ nodeData, onSave }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [memoryKey, setMemoryKey] = useState(
    nodeData?.memory_key || "chat_history"
  );
  const [returnMessages, setReturnMessages] = useState(
    nodeData?.return_messages ?? true
  );
  const [inputKey, setInputKey] = useState(nodeData?.input_key || "input");
  const [outputKey, setOutputKey] = useState(nodeData?.output_key || "output");

  const handleSave = () => {
    onSave({
      memory_key: memoryKey,
      return_messages: returnMessages,
      input_key: inputKey,
      output_key: outputKey,
    });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Buffer Memory</h3>

        <div className="space-y-4 mt-4">
          <div>
            <label className="label">Memory Key</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={memoryKey}
              onChange={(e) => setMemoryKey(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Return as Messages</label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="checkbox"
                checked={returnMessages}
                onChange={(e) => setReturnMessages(e.target.checked)}
              />
              <span className="text-sm">Enable message formatting</span>
            </label>
          </div>

          <div>
            <label className="label">Input Key</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Output Key</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={outputKey}
              onChange={(e) => setOutputKey(e.target.value)}
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

export default BufferMemoryConfigModal;
