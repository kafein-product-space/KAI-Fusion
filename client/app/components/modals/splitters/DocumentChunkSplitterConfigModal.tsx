import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";

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

// Split Strategy Options
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
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle">
      <div className="modal-box max-w-2xl">
        <h3 className="font-bold text-lg mb-2">
          Document Chunk Splitter Ayarları
        </h3>
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
            <Form className="space-y-4 mt-4">
              {/* Split Strategy */}
              <div className="form-control">
                <label className="label">Split Strategy</label>
                <Field
                  as="select"
                  className="select select-bordered w-full"
                  name="split_strategy"
                >
                  {SPLIT_STRATEGIES.map((strategy) => (
                    <option key={strategy.value} value={strategy.value}>
                      {strategy.label}
                    </option>
                  ))}
                </Field>
                <div className="text-xs text-gray-500 mt-1">
                  {
                    SPLIT_STRATEGIES.find(
                      (s) => s.value === values.split_strategy
                    )?.description
                  }
                </div>
              </div>

              {/* Chunk Size */}
              <div className="form-control">
                <label className="label">Chunk Size: {values.chunk_size}</label>
                <Field
                  type="range"
                  className="range range-primary"
                  name="chunk_size"
                  min="100"
                  max="8000"
                  step="100"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Her chunk'un maksimum boyutu (
                  {values.length_function === "tokens"
                    ? "tokens"
                    : "characters"}
                  )
                </div>
              </div>

              {/* Chunk Overlap */}
              <div className="form-control">
                <label className="label">
                  Chunk Overlap: {values.chunk_overlap}
                </label>
                <Field
                  type="range"
                  className="range range-primary"
                  name="chunk_overlap"
                  min="0"
                  max="2000"
                  step="25"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Ardışık chunk'lar arasındaki overlap (context korunması için)
                </div>
              </div>

              {/* Separators */}
              <div className="form-control">
                <label className="label">Custom Separators</label>
                <Field
                  className="input input-bordered w-full"
                  name="separators"
                  placeholder="\\n\\n,\\n, ,."
                />
                <div className="text-xs text-gray-500 mt-1">
                  Virgülle ayrılmış özel ayırıcılar (character splitter'lar
                  için)
                </div>
              </div>

              {/* Header Levels */}
              <div className="form-control">
                <label className="label">Header Levels</label>
                <Field
                  className="input input-bordered w-full"
                  name="header_levels"
                  placeholder="h1,h2,h3"
                />
                <div className="text-xs text-gray-500 mt-1">
                  Markdown/HTML için bölünecek header seviyeleri
                </div>
              </div>

              {/* Length Function */}
              <div className="form-control">
                <label className="label">Length Function</label>
                <Field
                  as="select"
                  className="select select-bordered w-full"
                  name="length_function"
                >
                  <option value="len">Characters</option>
                  <option value="tokens">Tokens (approximate)</option>
                </Field>
                <div className="text-xs text-gray-500 mt-1">
                  Chunk boyutunu ölçme yöntemi
                </div>
              </div>

              {/* Processing Options */}
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span>Keep Separator</span>
                  <Field
                    type="checkbox"
                    className="checkbox checkbox-primary ml-2"
                    name="keep_separator"
                  />
                </label>
                <div className="text-xs text-gray-500 mt-1">
                  Ayırıcıları chunk'larda tut (formatlamayı korur)
                </div>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span>Strip Whitespace</span>
                  <Field
                    type="checkbox"
                    className="checkbox checkbox-primary ml-2"
                    name="strip_whitespace"
                  />
                </label>
                <div className="text-xs text-gray-500 mt-1">
                  Chunk'lardan başındaki ve sonundaki boşlukları temizle
                </div>
              </div>

              {/* Buttons */}
              <div className="modal-action">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => dialogRef.current?.close()}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
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
