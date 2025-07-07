import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface WolframAlphaToolConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const WolframAlphaToolConfigModal = forwardRef<
  HTMLDialogElement,
  WolframAlphaToolConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [appId, setAppId] = useState(nodeData?.wolfram_alpha_appid || "");

  const handleSave = () => {
    onSave({ wolfram_alpha_appid: appId });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">
          Configure Wolfram Alpha Tool {nodeId}
        </h3>

        <div className="mt-4">
          <label className="label">Wolfram Alpha App ID</label>
          <input
            type="password"
            className="input input-bordered w-full"
            placeholder="Enter your App ID"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
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

export default WolframAlphaToolConfigModal;
