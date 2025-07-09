// components/modals/PromptTemplateConfigModal.tsx

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { tags as t } from "@lezer/highlight";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";

interface PromptTemplateConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

// 🎨 {} içindeki değerleri renklendir
const curlyHighlight = HighlightStyle.define([
  {
    tag: t.special(t.variableName),
    color: "#f59e0b", // amber-500
    fontWeight: "bold",
  },
  {
    tag: t.keyword,
    color: "#3b82f6", // blue-500
  },
]);
const customTheme = EditorView.theme({
  "&": {
    border: "1px solid #e5e7eb", // tailwind border-gray-300
    borderRadius: "0.375rem",
    fontSize: "0.875rem",
  },
  "&:focus-within": {
    border: "2px solid #a855f7", // tailwind purple-500
    outline: "none",
  },
});

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

        <div className="mt-4 space-y-2">
          <label className="label">
            <span className="label-text">Prompt Template</span>
          </label>

          {/* 👇 CodeMirror ile renkli input */}
          <div className="border  rounded-md overflow-hidden text-sm">
            <CodeMirror
              value={template}
              height="160px"
              basicSetup={{
                lineNumbers: false,
                highlightActiveLine: false,
                foldGutter: false,
              }}
              theme="light"
              extensions={[
                syntaxHighlighting(curlyHighlight),
                EditorView.lineWrapping,
                customTheme,
              ]}
              onChange={(value) => setTemplate(value)}
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

export default PromptTemplateConfigModal;
