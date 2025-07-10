import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface FaissVectorStoreConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const FaissVectorStoreConfigModal = forwardRef<
  HTMLDialogElement,
  FaissVectorStoreConfigModalProps
>(({ nodeData, onSave }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [indexName, setIndexName] = useState(
    nodeData?.index_name || "faiss_index"
  );
  const [saveLocal, setSaveLocal] = useState(nodeData?.save_local ?? false);
  const [folderPath, setFolderPath] = useState(
    nodeData?.folder_path || "./faiss_index"
  );

  const handleSave = () => {
    onSave({
      index_name: indexName,
      save_local: saveLocal,
      folder_path: folderPath,
    });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure FAISS Vector Store</h3>

        <div className="mt-4 space-y-4">
          <div>
            <label className="label">Index Name</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={indexName}
              onChange={(e) => setIndexName(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Folder Path</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
            />
          </div>

          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Save Index to Disk</span>
              <input
                type="checkbox"
                className="toggle"
                checked={saveLocal}
                onChange={(e) => setSaveLocal(e.target.checked)}
              />
            </label>
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

export default FaissVectorStoreConfigModal;
