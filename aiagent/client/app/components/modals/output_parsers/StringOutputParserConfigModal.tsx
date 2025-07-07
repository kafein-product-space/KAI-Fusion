import { forwardRef, useRef, useImperativeHandle } from "react";

interface StringOutputParserConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const StringOutputParserConfigModal = forwardRef<
  HTMLDialogElement,
  StringOutputParserConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const handleSave = () => {
    onSave({}); // Bu parser yapılandırma almaz
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">String Output Parser {nodeId}</h3>
        <p className="py-2 text-sm text-gray-600">
          This parser converts the output into a plain string. It’s useful for
          simple text responses.
        </p>

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

export default StringOutputParserConfigModal;
