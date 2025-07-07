import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface PromptTemplateConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const PromptTemplateConfigModal = forwardRef<
  HTMLDialogElement,
  PromptTemplateConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [template, setTemplate] = useState(nodeData?.template || "{input}");

  const handleSave = () => {
    onSave({ template });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Prompt Template</h3>

        <div className="mt-4">
          <label className="label">
            <span className="label-text">Prompt Template</span>
          </label>
          <textarea
            className="textarea textarea-bordered w-full h-48 font-mono text-sm"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            placeholder="e.g., Write a tweet about {topic}"
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

export default PromptTemplateConfigModal;
