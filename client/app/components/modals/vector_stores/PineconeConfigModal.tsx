import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface PineconeConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const PineconeConfigModal = forwardRef<
  HTMLDialogElement,
  PineconeConfigModalProps
>(({ nodeData, onSave }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [indexName, setIndexName] = useState(nodeData?.index_name || "");
  const [apiKey, setApiKey] = useState(nodeData?.api_key || "");
  const [namespace, setNamespace] = useState(nodeData?.namespace || "");
  const [textKey, setTextKey] = useState(nodeData?.text_key || "text");

  const handleSave = () => {
    onSave({
      index_name: indexName,
      api_key: apiKey,
      namespace,
      text_key: textKey,
    });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Pinecone Vector Store</h3>

        <div className="space-y-4 mt-4">
          {/* Index Name */}
          <div>
            <label className="label">Index Name</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={indexName}
              onChange={(e) => setIndexName(e.target.value)}
              placeholder="e.g. my-index"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="label">Pinecone API Key</label>
            <input
              type="password"
              className="input input-bordered w-full"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
            />
          </div>

          {/* Namespace */}
          <div>
            <label className="label">Namespace (optional)</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
              placeholder="default"
            />
          </div>

          {/* Text Key */}
          <div>
            <label className="label">Text Key (optional)</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={textKey}
              onChange={(e) => setTextKey(e.target.value)}
              placeholder="text"
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

export default PineconeConfigModal;
