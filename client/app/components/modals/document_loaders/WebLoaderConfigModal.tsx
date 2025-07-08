import { forwardRef, useRef, useImperativeHandle, useState } from "react";

interface WebLoaderConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const WebLoaderConfigModal = forwardRef<
  HTMLDialogElement,
  WebLoaderConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [urls, setUrls] = useState(nodeData?.urls || "");
  const [verifySSL, setVerifySSL] = useState(nodeData?.verify_ssl ?? true);
  const [headers, setHeaders] = useState(nodeData?.headers || "");

  const handleSave = () => {
    if (!urls) return alert("Please enter at least one URL.");
    onSave({ urls, verify_ssl: verifySSL, headers });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Web Page Loader {nodeId}</h3>

        <div className="form-control">
          <label className="label">URLs (comma-separated)</label>
          <textarea
            className="textarea textarea-bordered w-full"
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder="https://example.com, https://another.com"
          />
        </div>

        <div className="form-control mt-3">
          <label className="label cursor-pointer ">
            <span className="label-text">Verify SSL</span>
            <input
              type="checkbox"
              className="toggle ml-2"
              checked={verifySSL}
              onChange={(e) => setVerifySSL(e.target.checked)}
            />
          </label>
        </div>

        <div className="form-control mt-3">
          <label className="label">Custom Headers (JSON)</label>
          <textarea
            className="textarea textarea-bordered w-full"
            placeholder='{"User-Agent": "MyBot"}'
            value={headers}
            onChange={(e) => setHeaders(e.target.value)}
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

export default WebLoaderConfigModal;
