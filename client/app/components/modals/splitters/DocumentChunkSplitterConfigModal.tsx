import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { Scissors, Settings, Sliders, CheckCircle } from "lucide-react";

interface DocumentChunkSplitterConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface DocumentChunkSplitterConfig {
  split_strategy: string;
  chunk_size: number;
  chunk_overlap: number;
  separators: string;
  header_levels: string;
  keep_separator: boolean;
  strip_whitespace: boolean;
  length_function: string;
}

const SPLIT_STRATEGIES = [
  {
    value: "recursive_character",
    label: "Recursive Character Splitter",
    description: "Splits text recursively on separators, best for general text",
  },
  {
    value: "character",
    label: "Character Splitter",
    description: "Simple character-based splitting with fixed chunk size",
  },
  {
    value: "token",
    label: "Token Splitter",
    description: "Token-based splitting optimized for LLM context windows",
  },
  {
    value: "markdown",
    label: "Markdown Splitter",
    description: "Specialized for markdown documents with header preservation",
  },
  {
    value: "html",
    label: "HTML Splitter",
    description: "HTML-aware splitting with tag preservation",
  },
  {
    value: "latex",
    label: "LaTeX Splitter",
    description: "LaTeX document splitting with math expression handling",
  },
  {
    value: "code",
    label: "Code Splitter",
    description: "Programming language-aware code splitting",
  },
];

const DocumentChunkSplitterConfigModal = forwardRef<
  HTMLDialogElement,
  DocumentChunkSplitterConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const initialValues: DocumentChunkSplitterConfig = {
    split_strategy: nodeData?.split_strategy || "recursive_character",
    chunk_size: nodeData?.chunk_size || 1000,
    chunk_overlap: nodeData?.chunk_overlap || 200,
    separators: nodeData?.separators || "\\n\\n,\\n, ,.",
    header_levels: nodeData?.header_levels || "h1,h2,h3",
    keep_separator: nodeData?.keep_separator !== false,
    strip_whitespace: nodeData?.strip_whitespace !== false,
    length_function: nodeData?.length_function || "len",
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-bottom sm:modal-middle backdrop-blur-sm"
    >
      <div className="modal-box max-w-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl shadow-pink-500/10">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-700/50">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
            <Scissors className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-white">
              Document Chunk Splitter
            </h3>
            <p className="text-slate-400 text-sm">
              Configure how to split your documents into chunks
            </p>
          </div>
        </div>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          onSubmit={(values, { setSubmitting }) => {
            onSave(values);
            dialogRef.current?.close();
            setSubmitting(false);
          }}
        >
          {({ isSubmitting, values }) => (
            <Form className="space-y-6">
              {/* Split Strategy */}
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                <label className="text-white font-semibold flex items-center space-x-2 mb-2">
                  <Settings className="w-5 h-5 text-pink-400" />
                  <span>Split Strategy</span>
                </label>
                <Field
                  as="select"
                  className="select w-full bg-slate-900/80 text-white border border-slate-600/50 rounded-lg"
                  name="split_strategy"
                >
                  {SPLIT_STRATEGIES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Field>
                <div className="mt-2 text-xs text-slate-400">
                  {
                    SPLIT_STRATEGIES.find(
                      (s) => s.value === values.split_strategy
                    )?.description
                  }
                </div>
              </div>

              {/* Chunk Size / Overlap / Length Function */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  <label className="text-slate-300 text-sm mb-2 block">
                    Chunk Size:{" "}
                    <span className="text-pink-400 font-mono">
                      {values.chunk_size}
                    </span>
                  </label>
                  <Field
                    type="range"
                    name="chunk_size"
                    min={100}
                    max={8000}
                    step={100}
                    className="w-full"
                  />
                  <div className="text-xs text-slate-400 mt-1">
                    Max chunk size in{" "}
                    {values.length_function === "tokens"
                      ? "tokens"
                      : "characters"}
                  </div>
                </div>

                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  <label className="text-slate-300 text-sm mb-2 block">
                    Chunk Overlap:{" "}
                    <span className="text-pink-400 font-mono">
                      {values.chunk_overlap}
                    </span>
                  </label>
                  <Field
                    type="range"
                    name="chunk_overlap"
                    min={0}
                    max={2000}
                    step={25}
                    className="w-full"
                  />
                  <div className="text-xs text-slate-400 mt-1">
                    Overlap between chunks to preserve context
                  </div>
                </div>
              </div>

              {/* Separators / Headers / Length Function */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-slate-300 text-sm mb-1 block">
                    Custom Separators
                  </label>
                  <Field
                    name="separators"
                    className="input input-bordered w-full bg-slate-900/80 border border-slate-600/50 text-white rounded-lg px-4 py-3"
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-sm mb-1 block">
                    Header Levels
                  </label>
                  <Field
                    name="header_levels"
                    className="input input-bordered w-full bg-slate-900/80 border border-slate-600/50 text-white rounded-lg px-4 py-3"
                  />
                </div>
                <div>
                  <label className="text-slate-300 text-sm mb-1 block">
                    Length Function
                  </label>
                  <Field
                    as="select"
                    name="length_function"
                    className="select w-full bg-slate-900/80 text-white border border-slate-600/50 rounded-lg"
                  >
                    <option value="len">Characters</option>
                    <option value="tokens">Tokens (approximate)</option>
                  </Field>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {[
                  {
                    name: "keep_separator",
                    label: "Keep Separator",
                    description:
                      "Retain separators in chunks (preserves formatting)",
                  },
                  {
                    name: "strip_whitespace",
                    label: "Strip Whitespace",
                    description: "Trim leading/trailing whitespace from chunks",
                  },
                ].map(({ name, label, description }) => (
                  <label
                    key={name}
                    className="flex items-center justify-between p-4 bg-slate-900/30 rounded-lg border border-slate-600/20"
                  >
                    <div>
                      <div className="text-white text-sm font-medium">
                        {label}
                      </div>
                      <div className="text-slate-400 text-xs">
                        {description}
                      </div>
                    </div>
                    <Field
                      type="checkbox"
                      name={name}
                      className="toggle toggle-primary"
                    />
                  </label>
                ))}
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-slate-700/50">
                <button
                  type="button"
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg border border-slate-600 transition-all hover:scale-105"
                  onClick={() => dialogRef.current?.close()}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </dialog>
  );
});

export default DocumentChunkSplitterConfigModal;
