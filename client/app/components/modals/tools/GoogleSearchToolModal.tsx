import { forwardRef, useImperativeHandle, useRef } from "react";

interface GoogleSearchToolModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const GoogleSearchToolModal = forwardRef<
  HTMLDialogElement,
  GoogleSearchToolModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  return (
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Google Search Tool {nodeId}</h3>
        <p className="py-2 text-sm text-gray-600">
          Bu araç Google üzerinden arama yapar. Eğer API anahtarları sistemde
          yoksa, sahte test verisi döner.
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
                onSave({}); // bu tool parametre almadığı için boş veri
                dialogRef.current?.close();
              }}
            >
              Aktifleştir
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
});

export default GoogleSearchToolModal;
