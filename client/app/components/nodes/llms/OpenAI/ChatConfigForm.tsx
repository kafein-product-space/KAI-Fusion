import { Formik, Form, Field, ErrorMessage } from "formik";
import { Brain, Settings } from "lucide-react";

interface ChatConfigFormProps {
  configData: any;
  onSave: (values: any) => void;
  onCancel: () => void;
}

export default function ChatConfigForm({
  configData,
  onSave,
  onCancel,
}: ChatConfigFormProps) {
  return (
    <div className="relative w-48 h-auto min-h-32 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl border border-white/20 backdrop-blur-sm">
      <div className="flex items-center justify-between w-full px-3 py-2 border-b border-white/20">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-white" />
          <span className="text-white text-xs font-medium">OpenAI Chat</span>
        </div>
        <Settings className="w-4 h-4 text-white" />
      </div>

      <Formik
        initialValues={{
          model_name: configData.model_name || "gpt-4o",
          temperature: configData.temperature || 0.7,
          max_tokens: configData.max_tokens || 1000,
          api_key: configData.api_key || "",
        }}
        enableReinitialize
        validate={(values) => {
          const errors: any = {};
          if (!values.api_key) errors.api_key = "API key is required";
          if (values.temperature < 0 || values.temperature > 2)
            errors.temperature = "Temperature must be between 0 and 2";
          return errors;
        }}
        onSubmit={(values) => onSave(values)}
      >
        {({ values, errors, touched, isSubmitting }) => (
          <Form className="space-y-3 w-full p-3">
            {/* Model */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Model
              </label>
              <Field
                as="select"
                name="model_name"
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
              >
                <option value="gpt-4o">GPT-4o ⭐</option>
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-32k">GPT-4 32K</option>
              </Field>
              <ErrorMessage
                name="model_name"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Temperature */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Temperature
              </label>
              <Field
                name="temperature"
                type="range"
                min={0}
                max={2}
                step={0.1}
                className="w-full text-white"
              />
              <ErrorMessage
                name="temperature"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Max Tokens */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Max Tokens
              </label>
              <Field
                name="max_tokens"
                type="number"
                className="w-full text-white text-xs px-2 py-1 rounded bg-slate-900/80 border"
              />
              <ErrorMessage
                name="max_tokens"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* API Key */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                API Key
              </label>
              <Field
                name="api_key"
                type="password"
                className="w-full text-white text-xs px-2 py-1 rounded bg-slate-900/80 border"
              />
              <ErrorMessage
                name="api_key"
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
              >
                ✕
              </button>
              <button
                type="submit"
                disabled={isSubmitting || Object.keys(errors).length > 0}
                className="text-xs px-2 py-1 bg-blue-600 rounded text-white"
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
