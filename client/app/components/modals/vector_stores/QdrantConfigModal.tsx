import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface QdrantConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const QdrantConfigModal = forwardRef<HTMLDialogElement, QdrantConfigModalProps>(
  ({ nodeData, onSave }, ref) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    useImperativeHandle(ref, () => dialogRef.current!);

    const [collectionName, setCollectionName] = useState(
      nodeData?.collection_name || ""
    );
    const [url, setUrl] = useState(nodeData?.url || "http://localhost:6333");
    const [apiKey, setApiKey] = useState(nodeData?.api_key || "");
    const [path, setPath] = useState(nodeData?.path || "");

    const handleSave = () => {
      onSave({
        collection_name: collectionName,
        url,
        api_key: apiKey,
        path,
      });
      dialogRef.current?.close();
    };

    return (
      <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Configure Qdrant Vector Store</h3>

          <div className="space-y-4 mt-4">
            {/* Collection Name */}
            <div>
              <label className="label">Collection Name</label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                placeholder="e.g. my_collection"
              />
            </div>

            {/* URL */}
            <div>
              <label className="label">Server URL</label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://localhost:6333"
              />
            </div>

            {/* API Key */}
            <div>
              <label className="label">API Key (Optional)</label>
              <input
                type="password"
                className="input input-bordered w-full"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
            </div>

            {/* Path */}
            <div>
              <label className="label">Local Path (Optional)</label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="./qdrant_data"
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
  }
);

export default QdrantConfigModal;
