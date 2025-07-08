import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";

interface RequestsGetToolConfig {
  headers: string;
  timeout: number;
}

interface RequestsGetToolModalProps {
  nodeData: any;
  onSave: (data: RequestsGetToolConfig) => void;
  nodeId: string;
}

const RequestsGetToolModal = forwardRef<
  HTMLDialogElement,
  RequestsGetToolModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [headers, setHeaders] = useState<string>(
    JSON.stringify(
      nodeData?.headers || { "Content-Type": "application/json" },
      null,
      2
    )
  );
  const [timeout, setTimeoutValue] = useState<number>(nodeData?.timeout || 10);

  const handleSave = () => {
    try {
      const parsedHeaders = JSON.parse(headers);
      if (typeof parsedHeaders !== "object")
        throw new Error("Headers must be a valid JSON object.");
      onSave({ headers: parsedHeaders, timeout });
      dialogRef.current?.close();
    } catch (err) {
      alert("Invalid JSON in headers field.");
    }
  };

  return (
    <dialog ref={dialogRef} className="modal modal-open">
      <div className="modal-box w-96 max-w-2xl">
        <h3 className="font-bold text-lg">
          Requests GET Tool Settings {nodeId}
        </h3>

        <div className="mt-4">
          <label className="label">Headers (JSON)</label>
          <textarea
            className="textarea textarea-bordered w-full h-32"
            value={headers}
            onChange={(e) => setHeaders(e.target.value)}
          />
        </div>

        <div className="mt-4">
          <label className="label">Timeout (seconds)</label>
          <input
            type="number"
            className="input input-bordered w-full"
            value={timeout}
            onChange={(e) => setTimeoutValue(parseInt(e.target.value))}
            min={1}
          />
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

export default RequestsGetToolModal;
