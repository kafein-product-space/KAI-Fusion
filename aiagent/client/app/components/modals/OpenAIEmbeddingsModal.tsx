import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface OpenAIEmbeddingsConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const OpenAIEmbeddingsModal = forwardRef<
  HTMLDialogElement,
  OpenAIEmbeddingsConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [modelName, setModelName] = useState(
    nodeData?.model_name || "text-embedding-ada-002"
  );
  const [apiKey, setApiKey] = useState(nodeData?.api_key || "");
  const [chunkSize, setChunkSize] = useState(nodeData?.chunk_size || 1000);

  const handleSave = () => {
    onSave({
      model_name: modelName,
      api_key: apiKey,
      chunk_size: Number(chunkSize),
    });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure OpenAI Embeddings</h3>
        <div className="py-4 space-y-3">
          <div>
            <label className="label">
              <span className="label-text">Model Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">
              <span className="label-text">API Key</span>
            </label>
            <input
              type="password"
              className="input input-bordered w-full"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>
          <div>
            <label className="label">
              <span className="label-text">Chunk Size</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={chunkSize}
              onChange={(e) => setChunkSize(Number(e.target.value))}
              min={1}
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

export default OpenAIEmbeddingsModal;
