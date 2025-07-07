import { forwardRef, useRef, useImperativeHandle } from "react";

interface PydanticOutputParserConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const PydanticOutputParserConfigModal = forwardRef<
  HTMLDialogElement,
  PydanticOutputParserConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const handleSave = () => {
    // Şu anlık sabit Joke modeli
    onSave({ pydantic_object: "Joke" });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Pydantic Output Parser {nodeId}</h3>
        <p className="py-2">
          This parser formats the output into a Pydantic model.
        </p>

        <div className="form-control">
          <label className="label">Selected model</label>
          <input
            type="text"
            className="input input-bordered"
            value="Joke"
            disabled
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

export default PydanticOutputParserConfigModal;
