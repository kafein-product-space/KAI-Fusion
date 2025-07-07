import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface WikipediaToolConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

const WikipediaToolConfigModal = forwardRef<
  HTMLDialogElement,
  WikipediaToolConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [lang, setLang] = useState(nodeData?.lang || "en");

  const supportedLanguages = [
    { code: "en", label: "English" },
    { code: "tr", label: "Türkçe" },
    { code: "de", label: "Deutsch" },
    { code: "fr", label: "Français" },
    { code: "es", label: "Español" },
    { code: "ru", label: "Русский" },
    { code: "zh", label: "中文" },
    { code: "ja", label: "日本語" },
  ];

  const handleSave = () => {
    onSave({ lang });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure Wikipedia Tool {nodeId}</h3>

        <div className="mt-4">
          <label className="label">Language</label>
          <select
            className="select select-bordered w-full"
            value={lang}
            onChange={(e) => setLang(e.target.value)}
          >
            {supportedLanguages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label} ({l.code})
              </option>
            ))}
          </select>
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

export default WikipediaToolConfigModal;
