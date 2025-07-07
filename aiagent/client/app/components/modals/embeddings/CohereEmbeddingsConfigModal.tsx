import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface CohereEmbeddingsConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const CohereEmbeddingsConfigModal = forwardRef<
  HTMLDialogElement,
  CohereEmbeddingsConfigModalProps
>(({ nodeData, onSave }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [model, setModel] = useState(nodeData?.model || "embed-english-v2.0");
  const [apiKey, setApiKey] = useState(nodeData?.api_key || "");

  const handleSave = () => {
    onSave({ model, api_key: apiKey });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Cohere Embeddings</h3>

        <div className="space-y-4 mt-4">
          <div>
            <label className="label">
              <span className="label-text">Model</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="embed-english-v2.0"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Cohere API Key</span>
            </label>
            <input
              type="password"
              className="input input-bordered w-full"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="your cohere api key"
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

export default CohereEmbeddingsConfigModal;
