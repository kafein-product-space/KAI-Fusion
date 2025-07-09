import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface ReactAgentConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
}

const ReactAgentConfigModal = forwardRef<
  HTMLDialogElement,
  ReactAgentConfigModalProps
>(({ nodeData, onSave }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [agentName, setAgentName] = useState(nodeData?.name || "ReAct Agent");
  const [verbose, setVerbose] = useState(nodeData?.verbose ?? true);
  const [handleErrors, setHandleErrors] = useState(
    nodeData?.handle_parsing_errors ?? true
  );

  const handleSave = () => {
    onSave({
      name: agentName,
      verbose,
      handle_parsing_errors: handleErrors,
    });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure ReAct Agent</h3>

        <div className="mt-4 space-y-4">
          {/* Agent Name */}
          <div>
            <label className="label">Agent Name</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
            />
          </div>

          {/* Verbose toggle */}
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Verbose (show reasoning steps)</span>
              <input
                type="checkbox"
                className="toggle"
                checked={verbose}
                onChange={() => setVerbose(!verbose)}
              />
            </label>
          </div>

          {/* Handle Parsing Errors toggle */}
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Handle Parsing Errors</span>
              <input
                type="checkbox"
                className="toggle"
                checked={handleErrors}
                onChange={() => setHandleErrors(!handleErrors)}
              />
            </label>
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

export default ReactAgentConfigModal;
