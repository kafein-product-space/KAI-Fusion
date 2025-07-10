import { useState, useRef, forwardRef, useImperativeHandle } from "react";

interface WeaviateVectorStoreModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const WeaviateVectorStoreModal = forwardRef<
  HTMLDialogElement,
  WeaviateVectorStoreModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [url, setUrl] = useState(nodeData?.url || "http://localhost:8080");
  const [apiKey, setApiKey] = useState(nodeData?.api_key || "");
  const [indexName, setIndexName] = useState(
    nodeData?.index_name || "LangChain"
  );
  const [textKey, setTextKey] = useState(nodeData?.text_key || "text");

  const handleSave = () => {
    onSave({ url, api_key: apiKey, index_name: indexName, text_key: textKey });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Weaviate Vector Store</h3>

        <div className="space-y-3">
          <label className="form-control w-full">
            <span className="label-text">URL</span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input input-bordered w-full"
            />
          </label>

          <label className="form-control w-full">
            <span className="label-text">API Key</span>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="input input-bordered w-full"
            />
          </label>

          <label className="form-control w-full">
            <span className="label-text">Index Name</span>
            <input
              type="text"
              value={indexName}
              onChange={(e) => setIndexName(e.target.value)}
              className="input input-bordered w-full"
            />
          </label>

          <label className="form-control w-full">
            <span className="label-text">Text Key</span>
            <input
              type="text"
              value={textKey}
              onChange={(e) => setTextKey(e.target.value)}
              className="input input-bordered w-full"
            />
          </label>
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

export default WeaviateVectorStoreModal;
