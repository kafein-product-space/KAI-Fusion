import { Formik, Form, Field, ErrorMessage } from "formik";
import { Brain, Settings } from "lucide-react";
import { useUserCredentialStore } from "~/stores/userCredential";
import { getUserCredentialSecret } from "~/services/userCredentialService";
import { useEffect } from "react";
import CredentialSelector from "~/components/credentials/CredentialSelector";

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
  const { userCredentials, fetchCredentials } = useUserCredentialStore();

  // Fetch credentials on component mount
  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  return (
    <div className="relative p-2 w-64 h-auto min-h-32 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl border border-white/20 backdrop-blur-sm">
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
          credential_id: configData.credential_id || "",
        }}
        enableReinitialize
        validateOnMount={false}
        validateOnChange={false}
        validateOnBlur={true}
        validate={(values) => {
          const errors: any = {};
          // Only validate API key if it's not empty (allow empty for initial state)
          if (values.api_key && values.api_key.trim() === "") {
            errors.api_key = "API key is required";
          }
          if (values.temperature < 0 || values.temperature > 2)
            errors.temperature = "Temperature must be between 0 and 2";
          return errors;
        }}
        onSubmit={(values) => onSave(values)}
      >
        {({ values, errors, touched, isSubmitting, setFieldValue }) => (
          <Form className="space-y-3 w-full p-3">
            {/* Credential ID */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Credential
              </label>
              <CredentialSelector
                value={values.credential_id}
                onChange={async (credentialId) => {
                  setFieldValue("credential_id", credentialId);
                  if (credentialId) {
                    try {
                      const credentialSecret = await getUserCredentialSecret(
                        credentialId
                      );
                      if (credentialSecret?.secret?.api_key) {
                        setFieldValue(
                          "api_key",
                          credentialSecret.secret.api_key
                        );
                      }
                    } catch (error) {
                      console.error(
                        "Failed to fetch credential secret:",
                        error
                      );
                    }
                  } else {
                    setFieldValue("api_key", "");
                  }
                }}
                onCredentialLoad={(secret) => {
                  if (secret?.api_key) {
                    setFieldValue("api_key", secret.api_key);
                  }
                }}
                serviceType="openai"
                placeholder="Select Credential"
                showCreateNew={true}
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
              />
              <ErrorMessage
                name="credential_id"
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
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="api_key"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Model */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Model
              </label>
              <Field
                as="select"
                name="model_name"
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
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
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <div className="flex justify-between text-xs text-gray-300 mt-1">
                <span>0</span>
                <span className="font-bold text-blue-400">
                  {values.temperature}
                </span>
                <span>2</span>
              </div>
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
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="max_tokens"
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
                className="text-xs px-2 py-1 bg-blue-600 rounded text-white"
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
