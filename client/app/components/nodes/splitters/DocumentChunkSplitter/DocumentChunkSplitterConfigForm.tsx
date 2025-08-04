// DocumentChunkSplitterConfigForm.tsx
import React from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  Settings,
  Scissors,
  BarChart3,
  Eye,
  Zap,
  FileText,
  Split,
} from "lucide-react";
import type { DocumentChunkSplitterConfigFormProps } from "./types";

export default function DocumentChunkSplitterConfigForm({
  initialValues,
  validate,
  onSubmit,
  onCancel,
}: DocumentChunkSplitterConfigFormProps) {
  return (
    <div className="relative p-2 w-80 h-auto min-h-32 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl border border-white/20 backdrop-blur-sm">
      <div className="flex items-center justify-between w-full px-3 py-2 border-b border-white/20">
        <div className="flex items-center gap-2">
          <Scissors className="w-4 h-4 text-white" />
          <span className="text-white text-xs font-medium">
            Document Chunk Splitter
          </span>
        </div>
        <Settings className="w-4 h-4 text-white" />
      </div>

      <Formik
        initialValues={initialValues}
        validate={validate}
        onSubmit={onSubmit}
        enableReinitialize
      >
        {({ values, errors, touched, isSubmitting }) => (
          <Form className="space-y-3 w-full p-3">
            {/* Chunk Size */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Chunk Size
              </label>
              <Field
                name="chunkSize"
                type="number"
                min={100}
                max={10000}
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
                placeholder="1000"
              />
              <div className="text-xs text-gray-400 mt-1">
                Number of characters per chunk (100-10000)
              </div>
              <ErrorMessage
                name="chunkSize"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Overlap */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Overlap
              </label>
              <Field
                name="overlap"
                type="number"
                min={0}
                max={5000}
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
                placeholder="200"
              />
              <div className="text-xs text-gray-400 mt-1">
                Number of characters to overlap between chunks (0-5000)
              </div>
              <ErrorMessage
                name="overlap"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Separator */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Separator
              </label>
              <Field
                name="separator"
                type="text"
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
                placeholder="\n\n"
              />
              <div className="text-xs text-gray-400 mt-1">
                Character or string to split on (default: double newline)
              </div>
              <ErrorMessage
                name="separator"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Keep Separator */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Keep Separator
              </label>
              <Field
                as="select"
                name="keepSeparator"
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                <option value={true}>Yes</option>
                <option value={false}>No</option>
              </Field>
              <div className="text-xs text-gray-400 mt-1">
                Whether to keep the separator in the chunks
              </div>
              <ErrorMessage
                name="keepSeparator"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Length Function */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Length Function
              </label>
              <Field
                as="select"
                name="lengthFunction"
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                <option value="len">Character Count (len)</option>
                <option value="tokenizer">Token Count</option>
                <option value="custom">Custom Function</option>
              </Field>
              <div className="text-xs text-gray-400 mt-1">
                Function to measure chunk length
              </div>
              <ErrorMessage
                name="lengthFunction"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Is Separator Regex */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Use Regex Separator
              </label>
              <Field
                as="select"
                name="isSeparatorRegex"
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                <option value={false}>No</option>
                <option value={true}>Yes</option>
              </Field>
              <div className="text-xs text-gray-400 mt-1">
                Treat separator as regular expression
              </div>
              <ErrorMessage
                name="isSeparatorRegex"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Buttons */}
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onCancel}
                className="text-xs px-2 py-1 bg-slate-700 rounded"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                ✕
              </button>
              <button
                type="submit"
                disabled={isSubmitting || Object.keys(errors).length > 0}
                className="text-xs px-2 py-1 bg-orange-600 rounded text-white"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                ✓
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
