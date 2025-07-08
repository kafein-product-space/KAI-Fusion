import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface InMemoryCacheConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const InMemoryCacheConfigModal = forwardRef<
  HTMLDialogElement,
  InMemoryCacheConfigModalProps
>(({ nodeData, onSave }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [maxSize, setMaxSize] = useState<number>(nodeData?.max_size || 100);

  const handleSave = () => {
    onSave({ max_size: Number(maxSize) });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure In-Memory Cache</h3>

        <div className="py-4 space-y-3">
          <div>
            <label className="label">
              <span className="label-text">Max Cache Size</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={maxSize}
              min={1}
              onChange={(e) => setMaxSize(Number(e.target.value))}
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

export default InMemoryCacheConfigModal;
