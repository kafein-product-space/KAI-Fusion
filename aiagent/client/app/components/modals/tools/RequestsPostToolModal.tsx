import React, {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";

interface PostToolConfig {
  headers: Record<string, any>;
  timeout: number;
}

interface RequestsPostToolModalProps {
  nodeData: any;
  onSave: (data: PostToolConfig) => void;
  nodeId: string;
}

const RequestsPostToolModal = forwardRef<
  HTMLDialogElement,
  RequestsPostToolModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [headers, setHeaders] = useState(
    JSON.stringify(
      nodeData?.headers || { "Content-Type": "application/json" },
      null,
      2
    )
  );
  const [timeout, setTimeoutValue] = useState(nodeData?.timeout || 10);

  const handleSave = () => {
    try {
      const parsedHeaders = headers ? JSON.parse(headers) : {};
      onSave({
        headers: parsedHeaders,
        timeout: Number(timeout),
      });
      dialogRef.current?.close();
    } catch (e) {
      alert("Headers JSON formatında olmalı.");
    }
  };

  return (
    <dialog ref={dialogRef} className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">POST Tool Ayarları {nodeId}</h3>

        <label className="label">Headers (JSON):</label>
        <textarea
          className="textarea textarea-bordered w-full"
          rows={5}
          value={headers}
          onChange={(e) => setHeaders(e.target.value)}
        />

        <label className="label mt-2">Timeout (saniye):</label>
        <input
          type="number"
          className="input input-bordered w-full"
          value={timeout}
          onChange={(e) => setTimeoutValue(Number(e.target.value))}
        />

        <div className="modal-action">
          <button onClick={handleSave} className="btn btn-primary">
            Kaydet
          </button>
          <button onClick={() => dialogRef.current?.close()} className="btn">
            İptal
          </button>
        </div>
      </div>
    </dialog>
  );
});

export default RequestsPostToolModal;
