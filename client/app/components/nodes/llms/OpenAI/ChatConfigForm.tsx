import { Formik, Form, Field, ErrorMessage } from "formik";
import { Brain, Settings } from "lucide-react";
import { useUserCredentialStore } from "~/stores/userCredential";
import { getUserCredentialSecret } from "~/services/userCredentialService";
import { useEffect, useState } from "react";

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
  const [loadingCredential, setLoadingCredential] = useState(false);

  // Fetch credentials on component mount
  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  return (
    <div className="relative w-48 h-auto min-h-32 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl border border-white/20 backdrop-blur-sm z-50">
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

            {/* Credential ID */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Select Credential
              </label>
              <Field
                as="select"
                name="credential_id"
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onChange={async (e: any) => {
                  const selectedCredentialId = e.target.value;
                  setFieldValue("credential_id", selectedCredentialId);

                  // Auto-fill API key from selected credential
                  if (selectedCredentialId) {
                    setLoadingCredential(true);
                    try {
                      const credentialSecret = await getUserCredentialSecret(
                        selectedCredentialId
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
                    } finally {
                      setLoadingCredential(false);
                    }
                  } else {
                    setFieldValue("api_key", "");
                  }
                }}
              >
                <option value="">Select Credential</option>
                {userCredentials.map((credential) => (
                  <option key={credential.id} value={credential.id}>
                    {credential.name || credential.id}
                  </option>
                ))}
              </Field>
              {loadingCredential && (
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-cyan-400 text-xs">
                    Loading credential...
                  </span>
                </div>
              )}
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
                className="w-full text-white text-xs px-2 py-1 rounded bg-slate-900/80 border"
              />
              <ErrorMessage
                name="api_key"
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
