import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface HuggingFaceEmbeddingsConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const HuggingFaceEmbeddingsConfigModal = forwardRef<
  HTMLDialogElement,
  HuggingFaceEmbeddingsConfigModalProps
>(({ nodeData, onSave }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [modelName, setModelName] = useState(
    nodeData?.model_name || "sentence-transformers/all-MiniLM-L6-v2"
  );
  const [cacheFolder, setCacheFolder] = useState(nodeData?.cache_folder || "");
  const [encodeKwargs, setEncodeKwargs] = useState(
    JSON.stringify(
      nodeData?.encode_kwargs || { normalize_embeddings: false },
      null,
      2
    )
  );

  const handleSave = () => {
    let parsedEncodeKwargs = {};
    try {
      parsedEncodeKwargs = JSON.parse(encodeKwargs);
    } catch {
      alert("Invalid JSON in Encode Kwargs");
      return;
    }

    onSave({
      model_name: modelName,
      cache_folder: cacheFolder,
      encode_kwargs: parsedEncodeKwargs,
    });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure HuggingFace Embeddings</h3>

        <div className="space-y-4 mt-4">
          <div>
            <label className="label">
              <span className="label-text">Model Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="sentence-transformers/all-MiniLM-L6-v2"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Cache Folder (optional)</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={cacheFolder}
              onChange={(e) => setCacheFolder(e.target.value)}
              placeholder="/models/cache"
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Encode Kwargs (JSON)</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={4}
              value={encodeKwargs}
              onChange={(e) => setEncodeKwargs(e.target.value)}
              placeholder='{ "normalize_embeddings": false }'
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

export default HuggingFaceEmbeddingsConfigModal;
