// OpenAIEmbeddingsProviderConfigForm.tsx
import React, { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  Settings,
  Brain,
  Key,
  Lock,
  Globe,
  Sparkles,
  BarChart3,
  Database,
  Zap,
} from "lucide-react";
import { useUserCredentialStore } from "~/stores/userCredential";
import { getUserCredentialSecret } from "~/services/userCredentialService";
import CredentialSelector from "~/components/credentials/CredentialSelector";

// Standard props interface matching other config forms
interface OpenAIEmbeddingsProviderConfigFormProps {
  configData?: any;
  onSave?: (values: any) => void;
  onCancel: () => void;
  initialValues?: any;
  validate?: (values: any) => any;
  onSubmit?: (values: any) => void;
}

export default function OpenAIEmbeddingsProviderConfigForm({
  configData,
  onSave,
  onCancel,
  initialValues: propInitialValues,
  validate: propValidate,
  onSubmit: propOnSubmit,
}: OpenAIEmbeddingsProviderConfigFormProps) {
  
  // Default values for missing fields
  const defaultInitialValues = propInitialValues || {
    credential_id: configData?.credential_id || "",
    openai_api_key: configData?.openai_api_key || "",
    model: configData?.model || "text-embedding-3-small",
    organization: configData?.organization || "",
    batch_size: configData?.batch_size || 100,
    max_retries: configData?.max_retries || 3,
    request_timeout: configData?.request_timeout || 30,
    dimensions: configData?.dimensions || 1536,
  };

  // Validation function
  const defaultValidate = propValidate || ((values: any) => {
    const errors: any = {};
    if (!values.openai_api_key) {
      errors.openai_api_key = "API key is required";
    }
    if (!values.model) {
      errors.model = "Model is required";
    }
    if (values.dimensions < 1 || values.dimensions > 3072) {
      errors.dimensions = "Dimensions must be between 1 and 3072";
    }
    if (values.batch_size < 1 || values.batch_size > 1000) {
      errors.batch_size = "Batch size must be between 1 and 1000";
    }
    return errors;
  });

  const actualOnSubmit = propOnSubmit || onSave;
  const { userCredentials, fetchCredentials } = useUserCredentialStore();
  const [loadingCredential, setLoadingCredential] = useState(false);

  // Fetch credentials on component mount
  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  return (
    <div className="w-full h-full">
      <Formik
        initialValues={defaultInitialValues}
        validate={defaultValidate}
        onSubmit={(values, actions) => {
          console.log("OpenAIEmbeddings form submitting with values:", values);
          try {
            if (typeof actualOnSubmit === 'function') {
              actualOnSubmit(values);
            } else {
              console.error("actualOnSubmit is not a function:", actualOnSubmit);
            }
          } catch (error) {
            console.error("Error in OpenAIEmbeddings actualOnSubmit:", error);
          }
        }}
        enableReinitialize
        validateOnMount={false}
        validateOnChange={false}
        validateOnBlur={true}
      >
        {({ values, errors, touched, isSubmitting, setFieldValue }) => (
          <Form className="space-y-8 w-full p-6">
            {/* Model Selection */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Embedding Model
              </label>
              <Field
                as="select"
                name="model"
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                <option value="text-embedding-3-small">
                  text-embedding-3-small (1536D)
                </option>
                <option value="text-embedding-3-large">
                  text-embedding-3-large (3072D)
                </option>
                <option value="text-embedding-ada-002">
                  text-embedding-ada-002 (1536D)
                </option>
              </Field>
              <ErrorMessage
                name="model"
                component="div"
                className="text-red-400 text-sm mt-1"
              />
            </div>

            {/* Credential ID */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Select Credential
              </label>
              <CredentialSelector
                value={values.credential_id}
                onChange={async (credentialId) => {
                  setFieldValue("credential_id", credentialId);
                  if (credentialId) {
                    setLoadingCredential(true);
                    try {
                      const credentialSecret = await getUserCredentialSecret(
                        credentialId
                      );
                      if (credentialSecret?.secret?.api_key) {
                        setFieldValue(
                          "openai_api_key",
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
                    setFieldValue("openai_api_key", "");
                  }
                }}
                onCredentialLoad={(secret) => {
                  if (secret?.api_key) {
                    setFieldValue("openai_api_key", secret.api_key);
                  }
                }}
                serviceType="openai"
                placeholder="Select Credential"
                showCreateNew={true}
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {loadingCredential && (
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-cyan-400 text-sm">
                    Loading credential...
                  </span>
                </div>
              )}
              <ErrorMessage
                name="credential_id"
                component="div"
                className="text-red-400 text-sm mt-1"
              />
            </div>

            {/* API Key */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                API Key
              </label>
              <Field
                name="openai_api_key"
                type="password"
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="openai_api_key"
                component="div"
                className="text-red-400 text-sm mt-1"
              />
            </div>

            {/* Organization */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Organization (Optional)
              </label>
              <Field
                name="organization"
                type="text"
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
                placeholder="org-..."
              />
              <ErrorMessage
                name="organization"
                component="div"
                className="text-red-400 text-sm mt-1"
              />
            </div>

            {/* Batch Size */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Batch Size
              </label>
              <Field
                name="batch_size"
                type="number"
                min={1}
                max={100}
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="batch_size"
                component="div"
                className="text-red-400 text-sm mt-1"
              />
            </div>

            {/* Max Retries */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Max Retries
              </label>
              <Field
                name="max_retries"
                type="number"
                min={0}
                max={10}
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="max_retries"
                component="div"
                className="text-red-400 text-sm mt-1"
              />
            </div>

            {/* Request Timeout */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Request Timeout (seconds)
              </label>
              <Field
                name="request_timeout"
                type="number"
                min={10}
                max={300}
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="request_timeout"
                component="div"
                className="text-red-400 text-sm mt-1"
              />
            </div>

            {/* Dimensions (Auto-calculated based on model) */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Dimensions
              </label>
              <Field
                name="dimensions"
                type="number"
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
                readOnly
              />
              <div className="text-sm text-gray-400 mt-2">
                Auto-calculated based on model selection
              </div>
              <ErrorMessage
                name="dimensions"
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
