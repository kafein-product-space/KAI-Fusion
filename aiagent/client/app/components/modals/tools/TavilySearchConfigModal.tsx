import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface TavilySearchConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const TavilySearchConfigModal = forwardRef<
  HTMLDialogElement,
  TavilySearchConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [apiKey, setApiKey] = useState(nodeData?.tavily_api_key || "");

  const handleSave = () => {
    onSave({
      tavily_api_key: apiKey,
    });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Tavily Search {nodeId}</h3>

        <div className="space-y-4 mt-4">
          <div>
            <label className="label">Tavily API Key</label>
            <input
              className="input input-bordered w-full"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="your-tavily-api-key"
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

export default TavilySearchConfigModal;
