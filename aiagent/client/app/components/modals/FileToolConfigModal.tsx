import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface FileToolConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const FileToolConfigModal = forwardRef<
  HTMLDialogElement,
  FileToolConfigModalProps
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
        <h3 className="font-bold text-lg">File Tool Configuration {nodeId}</h3>

        <label className="label mt-2">
          <span className="label-text">Base Path</span>
        </label>
        <input
          type="text"
          className="input input-bordered w-full"
          value={basePath}
          onChange={(e) => setBasePath(e.target.value)}
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

export default FileToolConfigModal;
