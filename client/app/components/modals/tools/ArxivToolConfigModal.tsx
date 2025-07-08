import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface ArxivToolConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const ArxivToolConfigModal = forwardRef<
  HTMLDialogElement,
  ArxivToolConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [maxResults, setMaxResults] = useState(nodeData?.max_results || 3);

  const handleSave = () => {
    onSave({ max_results: maxResults });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Arxiv Tool {nodeId}</h3>

        <label className="label mt-2">
          <span className="label-text">Max Results</span>
        </label>
        <input
          type="number"
          className="input input-bordered w-full"
          value={maxResults}
          onChange={(e) => setMaxResults(Number(e.target.value))}
          min={1}
          max={25}
        />

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

export default ArxivToolConfigModal;
