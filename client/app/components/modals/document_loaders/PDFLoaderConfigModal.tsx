import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface PDFLoaderConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const PDFLoaderConfigModal = forwardRef<
  HTMLDialogElement,
  PDFLoaderConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [filePath, setFilePath] = useState(nodeData?.file_path || "");
  const [fileName, setFileName] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      // Bu path şimdilik sadece gösterim amaçlı. Gerçek path backend'de handle edilmeli.
      setFilePath(file.name); // veya istersen: `/uploads/${file.name}`
    }
  };

  const handleSave = () => {
    if (!filePath) {
      alert("Please select a PDF file.");
      return;
    }
    onSave({ file_path: filePath });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Select PDF File {nodeId}</h3>

        <div className="mt-4 space-y-3">
          <input
            type="file"
            accept=".pdf"
            className="file-input file-input-bordered w-full"
            onChange={handleFileChange}
          />
          {fileName && (
            <p className="text-sm text-slate-500">Selected: {fileName}</p>
          )}
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

export default PDFLoaderConfigModal;
