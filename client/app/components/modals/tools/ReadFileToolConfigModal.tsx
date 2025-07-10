import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface ReadFileToolConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const ReadFileToolConfigModal = forwardRef<
  HTMLDialogElement,
  ReadFileToolConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [basePath, setBasePath] = useState(
    nodeData?.base_path || "./workspace"
  );

  const handleSave = () => {
    onSave({ base_path: basePath });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Read File Tool {nodeId}</h3>

        <div className="mt-4 space-y-2">
          <label className="label">
            <span className="label-text">Base Path</span>
          </label>
          <input
            type="text"
            className="input input-bordered w-full"
            value={basePath}
            onChange={(e) => setBasePath(e.target.value)}
            placeholder="./workspace"
          />
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

export default ReadFileToolConfigModal;
