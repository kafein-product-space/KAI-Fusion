import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

interface CohereRerankerConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const CohereRerankerConfigModal = forwardRef<
  HTMLDialogElement,
  CohereRerankerConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [apiKey, setApiKey] = useState(nodeData?.cohere_api_key || "");
  const [model, setModel] = useState(nodeData?.model || "rerank-english-v3.0");
  const [topN, setTopN] = useState(nodeData?.top_n || 5);
  const [maxChunksPerDoc, setMaxChunksPerDoc] = useState(nodeData?.max_chunks_per_doc || 10);

  const handleSave = () => {
    onSave({
      cohere_api_key: apiKey,
      model: model,
      top_n: Number(topN),
      max_chunks_per_doc: Number(maxChunksPerDoc),
    });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Cohere Reranker Provider</h3>
        <div className="py-4 space-y-3">
          <div>
            <label className="label">
              <span className="label-text">API Key</span>
            </label>
            <input
              type="password"
              className="input input-bordered w-full"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="your-cohere-api-key"
            />
          </div>
          <div>
            <label className="label">
              <span className="label-text">Model</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              <option value="rerank-english-v3.0">rerank-english-v3.0</option>
              <option value="rerank-multilingual-v3.0">rerank-multilingual-v3.0</option>
              <option value="rerank-english-v2.0">rerank-english-v2.0</option>
              <option value="rerank-multilingual-v2.0">rerank-multilingual-v2.0</option>
            </select>
          </div>
          <div>
            <label className="label">
              <span className="label-text">Top N Results</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              min={1}
              max={50}
            />
          </div>
          <div>
            <label className="label">
              <span className="label-text">Max Chunks Per Document</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={maxChunksPerDoc}
              onChange={(e) => setMaxChunksPerDoc(Number(e.target.value))}
              min={1}
              max={100}
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

export default CohereRerankerConfigModal;