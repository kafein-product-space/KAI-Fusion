// OpenAIEmbeddingsNode/EmbeddingsConfigForm.tsx
import { Formik, Form, Field, ErrorMessage } from "formik";
import { Brain, Settings } from "lucide-react";

interface EmbeddingsConfigFormProps {
  configData: any;
  onCancel: () => void;
  onSave: (newConfig: any) => void;
}

export default function EmbeddingsConfigForm({
  configData,
  onCancel,
  onSave,
}: EmbeddingsConfigFormProps) {
  return (
    <div
      className="relative w-48 h-auto min-h-32 rounded-2xl flex flex-col items-center justify-center 
        bg-gradient-to-br from-purple-500 to-pink-600 shadow-2xl border border-white/20 backdrop-blur-sm"
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between w-full px-3 py-2 border-b border-white/20">
        <div className="flex items-center space-x-2">
          <Brain className="w-4 h-4 text-white" />
          <span className="text-white text-xs font-medium">
            OpenAI Embeddings
          </span>
        </div>
        <Settings className="w-4 h-4 text-white" />
      </div>

      {/* Form */}
      <div className="w-full p-3">
        <Formik
          initialValues={{
            embed_model: configData.embed_model || "text-embedding-3-small",
            openai_api_key: configData.openai_api_key || "",
            batch_size: configData.batch_size || 100,
            max_retries: configData.max_retries || 3,
          }}
          enableReinitialize
          validate={(values) => {
            const errors: any = {};
            if (!values.openai_api_key) {
              errors.openai_api_key = "API Key is required";
            }
            if (!values.embed_model) {
              errors.embed_model = "Model is required";
            }
            if (values.batch_size < 1 || values.batch_size > 1000) {
              errors.batch_size = "Batch size must be between 1 and 1000";
            }
            if (values.max_retries < 0 || values.max_retries > 10) {
              errors.max_retries = "Max retries must be between 0 and 10";
            }
            return errors;
          }}
          onSubmit={(values) => {
            onSave({ ...configData, ...values });
          }}
        >
          {({ values, errors, touched, isSubmitting }) => (
            <Form className="space-y-3 w-full mb-3">
              {/* Fields go here - embed_model, api_key, batch_size, max_retries */}
              {/* (Aynı alanları taşıyabilirsin buraya, sadece bu örnek kısa) */}

              {/* Action buttons */}
              <div className="flex space-x-2">
                <button type="button" onClick={onCancel} className="...">
                  ✕
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || Object.keys(errors).length > 0}
                  className="..."
                >
                  ✓
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
}
