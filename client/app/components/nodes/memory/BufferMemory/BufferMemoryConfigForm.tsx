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
    <div className="w-full h-full">
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
          <Form className="space-y-8 w-full p-6">
            {["memory_key", "input_key", "output_key"].map((key) => (
              <div key={key}>
                <label className="text-white text-sm font-medium mb-2 block">
                  {key.replace("_", " ").toUpperCase()}
                </label>
                <Field
                  name={key}
                  type="text"
                  className={`w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white px-4 py-3 text-sm rounded-lg ${
                    errors[key as keyof typeof errors] &&
                    touched[key as keyof typeof touched]
                      ? "border-red-500"
                      : "border-slate-600/50"
                  }`}
                />
                <ErrorMessage
                  name={key}
                  component="div"
                  className="text-red-400 text-sm mt-1"
                />
              </div>
            ))}
            {/* Toggle */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
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

          </Form>
        )}
      </Formik>
    </div>
  );
}
