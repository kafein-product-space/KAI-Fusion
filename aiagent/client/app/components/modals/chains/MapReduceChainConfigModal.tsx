import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface MapReduceChainConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const MapReduceChainConfigModal = forwardRef<
  HTMLDialogElement,
  MapReduceChainConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [mapPrompt, setMapPrompt] = useState(
    nodeData?.map_prompt || "Summarize this content:\n\n{context}"
  );
  const [reducePrompt, setReducePrompt] = useState(
    nodeData?.reduce_prompt || "Combine these summaries:\n\n{context}"
  );
  const [documentVar, setDocumentVar] = useState(
    nodeData?.document_variable_name || "context"
  );

  const handleSave = () => {
    onSave({
      map_prompt: mapPrompt,
      reduce_prompt: reducePrompt,
      document_variable_name: documentVar,
    });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Map-Reduce Chain</h3>

        <div className="space-y-4 mt-4">
          <div>
            <label className="label">
              <span className="label-text">Map Prompt</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={4}
              value={mapPrompt}
              onChange={(e) => setMapPrompt(e.target.value)}
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Reduce Prompt</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              rows={4}
              value={reducePrompt}
              onChange={(e) => setReducePrompt(e.target.value)}
            />
          </div>

          <div>
            <label className="label">
              <span className="label-text">Document Variable Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={documentVar}
              onChange={(e) => setDocumentVar(e.target.value)}
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

export default MapReduceChainConfigModal;
