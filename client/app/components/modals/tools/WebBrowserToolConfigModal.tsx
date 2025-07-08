import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface WebBrowserToolConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const WebBrowserToolConfigModal = forwardRef<
  HTMLDialogElement,
  WebBrowserToolConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [headers, setHeaders] = useState(
    JSON.stringify(
      nodeData?.headers || { "User-Agent": "Mozilla/5.0" },
      null,
      2
    )
  );

  const handleSave = () => {
    try {
      const parsedHeaders = JSON.parse(headers);
      onSave({ headers: parsedHeaders });
      dialogRef.current?.close();
    } catch (error) {
      alert("Headers must be valid JSON");
    }
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Web Browser Tool</h3>

        <div className="mt-4 space-y-4">
          <div>
            <label className="label">HTTP Headers (JSON format)</label>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={6}
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
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

export default WebBrowserToolConfigModal;
