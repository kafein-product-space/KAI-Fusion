import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface ChromaRetrieverConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const ChromaRetrieverConfigModal = forwardRef<
  HTMLDialogElement,
  ChromaRetrieverConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [collectionName, setCollectionName] = useState(
    nodeData?.collection_name || "default_collection"
  );

  const handleSave = () => {
    onSave({ collection_name: collectionName });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Chroma Retriever {nodeId}</h3>

        <label className="label">
          <span className="label-text">Collection Name</span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          value={collectionName}
          onChange={(e) => setCollectionName(e.target.value)}
        />

        <div className="mt-4 text-sm text-gray-500">
          This retriever requires an embedding function to be connected.
        </div>

        <div className="modal-action">
          <button className="btn" onClick={() => dialogRef.current?.close()}>
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

export default ChromaRetrieverConfigModal;
