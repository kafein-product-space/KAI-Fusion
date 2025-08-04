import { Formik, Form, Field, ErrorMessage } from "formik";
import { Database, Settings } from "lucide-react";

export default function BufferMemoryConfigForm({
  configData,
  onSave,
  onCancel,
}: {
  configData: any;
  onSave: (values: any) => void;
  onCancel: () => void;
}) {
  return (
    <div className="relative group w-48 h-auto min-h-32 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl border border-white/20 backdrop-blur-sm">
      <div className="flex items-center justify-between w-full px-3 py-2 border-b border-white/20">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-white" />
          <span className="text-white text-xs font-medium">Buffer Memory</span>
        </div>
        <Settings className="w-4 h-4 text-white" />
      </div>

      <Formik
        initialValues={{
          memory_key: configData.memory_key || "memory",
          return_messages: configData.return_messages ?? true,
          input_key: configData.input_key || "input",
          output_key: configData.output_key || "output",
        }}
        enableReinitialize
        validate={(values) => {
          const errors: any = {};
          if (!values.memory_key) errors.memory_key = "Memory key is required";
          if (!values.input_key) errors.input_key = "Input key is required";
          if (!values.output_key) errors.output_key = "Output key is required";
          return errors;
        }}
        onSubmit={(values) => onSave(values)}
      >
        {({ values, errors, touched, isSubmitting }) => (
          <Form className="space-y-3 w-full p-3">
            {["memory_key", "input_key", "output_key"].map((key) => (
              <div key={key}>
                <label className="text-white text-xs font-medium mb-1 block">
                  {key.replace("_", " ").toUpperCase()}
                </label>
                <Field
                  name={key}
                  type="text"
                  className={`w-full bg-slate-900/80 border text-white px-2 py-1 text-xs rounded-lg ${
                    errors[key as keyof typeof errors] &&
                    touched[key as keyof typeof touched]
                      ? "border-red-500"
                      : "border-slate-600/50"
                  }`}
                />
                <ErrorMessage
                  name={key}
                  component="div"
                  className="text-red-400 text-xs mt-1"
                />
              </div>
            ))}
            {/* Toggle */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Return Messages
              </label>
              <Field name="return_messages">
                {({ field }: any) => (
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-600 peer-checked:bg-gradient-to-r peer-checked:from-cyan-500 peer-checked:to-blue-600 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:h-5 after:w-5 after:rounded-full peer-checked:after:translate-x-full after:transition-all"></div>
                  </label>
                )}
              </Field>
            </div>

            {/* Buttons */}
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-2 py-1 bg-slate-700 text-white rounded text-xs"
              >
                ✕
              </button>
              <button
                type="submit"
                disabled={isSubmitting || Object.keys(errors).length > 0}
                className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded text-xs"
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
