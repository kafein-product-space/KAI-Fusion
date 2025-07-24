import CodeMirror from "@uiw/react-codemirror";
import { tags as t } from "@lezer/highlight";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { useThemeStore } from "~/stores/theme";

interface ReactAgentConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
} // 🎨 {} içindeki değerleri renklendir
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

const ReactAgentConfigModal = forwardRef<
  HTMLDialogElement,
  ReactAgentConfigModalProps
>(({ nodeData, onSave }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [agentName, setAgentName] = useState(nodeData?.name || "ReAct Agent");
  const [verbose, setVerbose] = useState(nodeData?.verbose ?? true);
  const [handleErrors, setHandleErrors] = useState(
    nodeData?.handle_parsing_errors ?? true
  );
  const [promptTemplate, setPromptTemplate] = useState(
    nodeData?.prompt_template ||
      "You are a helpful assistant. Use tools to answer: {input}"
  );
  const { mode } = useThemeStore();
  const handleSave = () => {
    onSave({
      name: agentName,
      verbose,
      handle_parsing_errors: handleErrors,
      prompt_template: promptTemplate,
    });
    dialogRef.current?.close();
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Configure ReAct Agent</h3>

        <div className="mt-4 space-y-4">
          {/* Agent Name */}
          <div>
            <label className="label">Agent Name</label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
            />
          </div>

          {/* Prompt Template */}
          <div>
            <label className="label">Prompt Template</label>

            <CodeMirror
              value={promptTemplate}
              height="160px"
              placeholder="You are a helpful assistant. Use tools to answer: {input}"
              basicSetup={{
                lineNumbers: false,
                highlightActiveLine: false,
                foldGutter: false,
              }}
              theme={mode === "dark" ? "dark" : "light"}
              extensions={[
                syntaxHighlighting(curlyHighlight),
                EditorView.lineWrapping,
                customTheme,
              ]}
              onChange={(value) => setPromptTemplate(value)}
            />
          </div>

          {/* Verbose toggle */}
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Verbose</span>
              <input
                type="checkbox"
                className="toggle"
                checked={verbose}
                onChange={() => setVerbose(!verbose)}
              />
            </label>
          </div>

          {/* Handle Parsing Errors toggle */}
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Handle Parsing Errors</span>
              <input
                type="checkbox"
                className="toggle"
                checked={handleErrors}
                onChange={() => setHandleErrors(!handleErrors)}
              />
            </label>
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

export default ReactAgentConfigModal;
