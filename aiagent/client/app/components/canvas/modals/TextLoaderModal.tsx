import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface TextLoaderConfig {
  text: string;
}

interface TextLoaderModalProps {
  nodeData: any;
  onSave: (data: TextLoaderConfig) => void;
  nodeId: string;
}

const TextLoaderModal = forwardRef<HTMLDialogElement, TextLoaderModalProps>(
  ({ nodeData, onSave, nodeId }, ref) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    useImperativeHandle(ref, () => dialogRef.current!);

    const [text, setText] = useState<string>(nodeData?.text || "");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setText(event.target?.result as string);
        };
        reader.readAsText(file);
      }
    };

    const handleSave = () => {
      onSave({ text });
      dialogRef.current?.close();
    };

    return (
      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg">Text Data Loader</h3>
          <div className="form-control flex flex-col gap-2">
            <label className="label">Text Dosyası Yükle (.txt)</label>
            <input
              type="file"
              accept=".txt"
              className="file-input file-input-bordered w-full"
              onChange={handleFileChange}
            />
          </div>
          <div className="form-control flex flex-col gap-2 mt-2">
            <label className="label">Text</label>
            <textarea
              name="text"
              className="textarea textarea-bordered w-full min-h-[100px]"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Yüklenecek metni girin veya dosya seçin..."
            />
          </div>
          <div className="modal-action flex gap-2">
            <button
              className="btn btn-outline"
              onClick={() => dialogRef.current?.close()}
            >
              İptal
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              Kaydet
            </button>
          </div>
        </div>
      </dialog>
    );
  }
);

export default TextLoaderModal;
