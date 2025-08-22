import { Formik, Form, Field, ErrorMessage } from "formik";
import { Brain, Settings } from "lucide-react";
import { useUserCredentialStore } from "~/stores/userCredential";
import { getUserCredentialSecret } from "~/services/userCredentialService";
import { useEffect } from "react";
import CredentialSelector from "~/components/credentials/CredentialSelector";

// Custom CSS for range slider
const sliderStyle = `
  .slider::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #3B82F6;
    cursor: pointer;
    border: 2px solid #1E40AF;
  }
  
  .slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #3B82F6;
    cursor: pointer;
    border: 2px solid #1E40AF;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = sliderStyle;
  document.head.appendChild(styleSheet);
}

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
    <div className="relative w-full h-auto rounded-2xl flex flex-col bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl border border-white/20 backdrop-blur-sm">
      <div className="flex items-center justify-between w-full px-6 py-4 border-b border-white/20">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-white" />
          <span className="text-white text-lg font-medium">OpenAI Chat Configuration</span>
        </div>
        <Settings className="w-6 h-6 text-white" />
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
          <Form className="space-y-6 w-full p-6">
            {/* Credential ID */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
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
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <ErrorMessage
                name="credential_id"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* API Key */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                API Key
              </label>
              <Field
                name="api_key"
                type="password"
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
              <label className="text-white text-sm font-medium mb-2 block">
                Model
              </label>
              <Field
                as="select"
                name="model_name"
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
              <label className="text-white text-sm font-medium mb-2 block">
                Temperature: <span className="text-blue-400 font-mono">{values.temperature}</span>
              </label>
              <Field
                name="temperature"
                type="range"
                min={0}
                max={2}
                step={0.1}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <div className="flex justify-between text-sm text-gray-400 mt-2">
                <span>Precise (0)</span>
                <span>Creative (2)</span>
              </div>
              <ErrorMessage
                name="temperature"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Max Tokens */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Max Tokens
              </label>
              <Field
                name="max_tokens"
                type="number"
                min="1"
                max="4096"
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-600">
              <button
                type="button"
                onClick={onCancel}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white font-medium transition-colors"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || Object.keys(errors).length > 0}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center gap-2"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  'Save Configuration'
                )}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
