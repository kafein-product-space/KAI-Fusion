import React from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { Type } from "lucide-react";
import type { StringInputData } from "./types";

interface StringInputConfigFormProps {
  initialValues?: StringInputData;
  validate?: (values: Partial<StringInputData>) => any;
  onSubmit?: (values: StringInputData) => void;
  onCancel: () => void;
  configData?: any;
  onSave?: (values: any) => void;
}

export default function StringInputConfigForm({
  initialValues: propInitialValues,
  validate: propValidate,
  onSubmit: propOnSubmit,
  onCancel,
  configData,
  onSave,
}: StringInputConfigFormProps) {

  // Default values for missing fields
  const initialValues = propInitialValues || {
    text_input: configData?.text_input || "",
  };

  // Validation function
  const validate = propValidate || ((values: any) => {
    const errors: any = {};
    // Text input is not required since it can come from connected nodes
    if (values.text_input && values.text_input.length > 10000) {
      errors.text_input = "Text input must be 10,000 characters or less";
    }
    return errors;
  });

  // Use the provided onSubmit or fallback to onSave
  const handleSubmit = propOnSubmit || onSave || (() => {});

  return (
    <div className="w-full h-full">
      <Formik
        initialValues={initialValues}
        validate={validate}
        onSubmit={handleSubmit}
        enableReinitialize
      >
        {({ values, errors, touched, isSubmitting, setFieldValue }) => (
          <Form className="space-y-8 w-full p-6">
            {/* Text Input */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block flex items-center gap-2">
                <Type className="h-4 w-4" />
                Text Input (Optional - can also receive from connected nodes)
              </label>
              <Field
                as="textarea"
                name="text_input"
                placeholder="Enter your text content here..."
                rows={8}
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-vertical min-h-[120px]"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="text_input"
                component="div"
                className="text-red-400 text-sm mt-1"
              />
              <div className="text-gray-400 text-xs mt-1">
                Characters: {values.text_input?.length || 0} / 10,000
              </div>
            </div>



            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                {isSubmitting ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}