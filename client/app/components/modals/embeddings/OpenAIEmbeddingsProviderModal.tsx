import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface OpenAIEmbeddingsProviderModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const OpenAIEmbeddingsProviderModal = forwardRef<
  HTMLDialogElement,
  OpenAIEmbeddingsProviderModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [apiKey, setApiKey] = useState(nodeData?.openai_api_key || "");
  const [model, setModel] = useState(
    nodeData?.model || "text-embedding-3-small"
  );
  const [requestTimeout, setRequestTimeout] = useState(
    nodeData?.request_timeout || 60
  );
  const [maxRetries, setMaxRetries] = useState(nodeData?.max_retries || 3);

  const handleSave = () => {
    onSave({
      openai_api_key: apiKey,
      model: model,
      request_timeout: Number(requestTimeout),
      max_retries: Number(maxRetries),
    });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">
          Configure OpenAI Embeddings Provider
        </h3>
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
              placeholder="sk-..."
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
              <option value="text-embedding-3-small">
                text-embedding-3-small
              </option>
              <option value="text-embedding-3-large">
                text-embedding-3-large
              </option>
              <option value="text-embedding-ada-002">
                text-embedding-ada-002
              </option>
            </select>
          </div>
          <div>
            <label className="label">
              <span className="label-text">Request Timeout (seconds)</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={requestTimeout}
              onChange={(e) => setRequestTimeout(Number(e.target.value))}
              min={10}
              max={300}
            />
          </div>
          <div>
            <label className="label">
              <span className="label-text">Max Retries</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={maxRetries}
              onChange={(e) => setMaxRetries(Number(e.target.value))}
              min={0}
              max={5}
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

export default OpenAIEmbeddingsProviderModal;
