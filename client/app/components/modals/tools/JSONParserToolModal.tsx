import { forwardRef, useImperativeHandle, useRef } from "react";

interface JSONParserToolModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const JSONParserToolModal = forwardRef<
  HTMLDialogElement,
  JSONParserToolModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  return (
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">JSON Parser Tool {nodeId}</h3>
        <p className="py-2 text-sm text-gray-600">
          Bu araç, geçerli bir JSON string'ini biçimlendirilmiş (pretty) hale
          getirir. LLM çıktısını daha okunabilir hale getirmek için
          kullanılabilir.
        </p>

        <div className="modal-action">
          <form method="dialog" className="flex justify-end gap-2">
            <button
              className="btn"
              type="button"
              onClick={() => dialogRef.current?.close()}
            >
              İptal
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                onSave({});
                dialogRef.current?.close();
              }}
            >
              Kaydet
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
});

export default JSONParserToolModal;
