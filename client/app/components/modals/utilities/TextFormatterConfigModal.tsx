import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface TextFormatterConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const operations = [
  "uppercase",
  "lowercase",
  "title",
  "capitalize",
  "strip",
  "reverse",
];

const TextFormatterConfigModal = forwardRef<
  HTMLDialogElement,
  TextFormatterConfigModalProps
>(({ nodeData, onSave }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [text, setText] = useState(nodeData?.text || "");
  const [operation, setOperation] = useState(
    nodeData?.operation || "uppercase"
  );

  const handleSave = () => {
    onSave({ text, operation });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Text Formatter</h3>

        <div className="space-y-4 mt-4">
          {/* Text Input */}
          <div>
            <label className="label">Text to Format</label>
            <textarea
              className="textarea textarea-bordered w-full h-24"
              placeholder="Enter text here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>

          {/* Operation Select */}
          <div>
            <label className="label">Format Operation</label>
            <select
              className="select select-bordered w-full"
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
            >
              {operations.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
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

export default TextFormatterConfigModal;
