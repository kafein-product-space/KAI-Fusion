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
  onSave,
  onCancel,
  configData,
}: DocumentChunkSplitterConfigFormProps & { configData?: any; onSave?: any }) {

  const defaultInitialValues = {
    chunkSize: 1000,
    overlap: 200,
    separator: "\\n\\n",
    keepSeparator: true,
    lengthFunction: "len",
    isSeparatorRegex: false,
    ...(initialValues || configData)
  };

  const defaultValidate = validate || ((values: any) => {
    const errors: any = {};
    if (!values.chunkSize || values.chunkSize < 100 || values.chunkSize > 10000) {
      errors.chunkSize = "Chunk size must be between 100 and 10000";
    }
    if (values.overlap < 0 || values.overlap > 5000) {
      errors.overlap = "Overlap must be between 0 and 5000";
    }
    return errors;
  });

  const actualOnSubmit = onSubmit || onSave;
  return (
    <div className="w-full h-full">
      <Formik
        initialValues={defaultInitialValues}
        validate={defaultValidate}
        onSubmit={(values, actions) => {
          console.log("DocumentChunkSplitter form submitting with values:", values);
          try {
            if (typeof actualOnSubmit === 'function') {
              actualOnSubmit(values);
            } else {
              console.error("actualOnSubmit is not a function:", actualOnSubmit);
            }
          } catch (error) {
            console.error("Error in onSubmit:", error);
          }
        }}
        enableReinitialize
      >
        {({ values, errors, touched, isSubmitting }) => (
          <Form className="space-y-8 w-full p-6">
            {/* Chunk Size */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Chunk Size
              </label>
              <Field
                name="chunkSize"
                type="number"
                min={100}
                max={10000}
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
                placeholder="1000"
              />
              <div className="text-sm text-gray-400 mt-2">
                Number of characters per chunk (100-10000)
              </div>
              <ErrorMessage
                name="chunkSize"
                component="div"
                className="text-red-400 text-sm mt-1"
              />
            </div>

            {/* Overlap */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Overlap
              </label>
              <Field
                name="overlap"
                type="number"
                min={0}
                max={5000}
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
                placeholder="200"
              />
              <div className="text-sm text-gray-400 mt-2">
                Number of characters to overlap between chunks (0-5000)
              </div>
              <ErrorMessage
                name="overlap"
                component="div"
                className="text-red-400 text-sm mt-1"
              />
            </div>

            {/* Separator */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Separator
              </label>
              <Field
                name="separator"
                type="text"
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
                placeholder="\n\n"
              />
              <div className="text-sm text-gray-400 mt-2">
                Character or string to split on (default: double newline)
              </div>
              <ErrorMessage
                name="separator"
                component="div"
                className="text-red-400 text-sm mt-1"
              />
            </div>

            {/* Keep Separator */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Keep Separator
              </label>
              <Field
                as="select"
                name="keepSeparator"
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Field>
              <div className="text-sm text-gray-400 mt-2">
                Whether to keep the separator in the chunks
              </div>
              <ErrorMessage
                name="keepSeparator"
                component="div"
                className="text-red-400 text-sm mt-1"
              />
            </div>

            {/* Length Function */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Length Function
              </label>
              <Field
                as="select"
                name="lengthFunction"
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                <option value="len">Character Count (len)</option>
                <option value="tokenizer">Token Count</option>
                <option value="custom">Custom Function</option>
              </Field>
              <div className="text-sm text-gray-400 mt-2">
                Function to measure chunk length
              </div>
              <ErrorMessage
                name="lengthFunction"
                component="div"
                className="text-red-400 text-sm mt-1"
              />
            </div>

            {/* Is Separator Regex */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Use Regex Separator
              </label>
              <Field
                as="select"
                name="isSeparatorRegex"
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </Field>
              <div className="text-sm text-gray-400 mt-2">
                Treat separator as regular expression
              </div>
              <ErrorMessage
                name="isSeparatorRegex"
                component="div"
                className="text-red-400 text-sm mt-1"
              />
            </div>

          </Form>
        )}
      </Formik>
    </div>
  );
}
