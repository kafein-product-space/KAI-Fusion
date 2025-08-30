// CohereRerankerConfigForm.tsx
import React, { useEffect } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { Settings, Filter, Key } from "lucide-react";
import { useUserCredentialStore } from "~/stores/userCredential";
import { getUserCredentialSecret } from "~/services/userCredentialService";
import CredentialSelector from "~/components/credentials/CredentialSelector";

// Standard props interface matching other config forms
interface CohereRerankerConfigFormProps {
  configData?: any;
  onSave?: (values: any) => void;
  onCancel: () => void;
  initialValues?: any;
  validate?: (values: any) => any;
  onSubmit?: (values: any) => void;
}

export default function CohereRerankerConfigForm({
  configData,
  onSave,
  onCancel,
  initialValues: propInitialValues,
  validate: propValidate,
  onSubmit: propOnSubmit,
}: CohereRerankerConfigFormProps) {
  // Default values for missing fields
  const initialValues = propInitialValues || {
    credential_id: configData?.credential_id || "",
    cohere_api_key: configData?.cohere_api_key || "",
    model: configData?.model || "rerank-english-v3.0",
    top_n: configData?.top_n || 10,
    max_chunks_per_doc: configData?.max_chunks_per_doc || 10,
  };

  // Validation function
  const validate = propValidate || ((values: any) => {
    const errors: any = {};
    if (!values.cohere_api_key) {
      errors.cohere_api_key = "API key is required";
    }
    if (!values.model) {
      errors.model = "Model is required";
    }
    if (values.top_n < 1 || values.top_n > 20) {
      errors.top_n = "Top N must be between 1 and 20";
    }
    if (values.max_chunks_per_doc < 1 || values.max_chunks_per_doc > 50) {
      errors.max_chunks_per_doc = "Max chunks per doc must be between 1 and 50";
    }
    return errors;
  });

  // Use the provided onSubmit or fallback to onSave
  const handleSubmit = propOnSubmit || onSave || (() => {});
  const { userCredentials, fetchCredentials } = useUserCredentialStore();

  // Fetch credentials on component mount
  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

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
            {/* Credential ID */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Select Credential
              </label>
              <CredentialSelector
                value={values.credential_id}
                onChange={async (credentialId) => {
                  setFieldValue("credential_id", credentialId);

                  // Auto-fill API key from selected credential
                  if (credentialId) {
                    try {
                      const credentialSecret = await getUserCredentialSecret(
                        credentialId
                      );
                      if (credentialSecret?.secret?.api_key) {
                        setFieldValue(
                          "cohere_api_key",
                          credentialSecret.secret.api_key
                        );
                      }
                    } catch (error) {
                      console.error(
                        "Failed to fetch credential secret:",
                        error
                      );
                    }
                  }
                }}
                onCredentialLoad={(secret) => {
                  if (secret?.api_key) {
                    setFieldValue("cohere_api_key", secret.api_key);
                  }
                }}
                serviceType="cohere"
                placeholder="Select Credential"
                showCreateNew={true}
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
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
                name="cohere_api_key"
                type="password"
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="cohere_api_key"
                component="div"
                className="text-red-400 text-sm mt-1"
              />
            </div>

            {/* Model */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Model
              </label>
              <Field
                as="select"
                name="model"
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                <option value="rerank-english-v3.0">Rerank English v3.0</option>
                <option value="rerank-multilingual-v3.0">
                  Rerank Multilingual v3.0
                </option>
                <option value="rerank-english-v2.0">Rerank English v2.0</option>
                <option value="rerank-multilingual-v2.0">
                  Rerank Multilingual v2.0
                </option>
              </Field>
              <ErrorMessage
                name="model"
                component="div"
                className="text-red-400 text-sm mt-1"
              />
            </div>

            {/* Top N */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Top N
              </label>
              <Field
                name="top_n"
                type="range"
                min={1}
                max={20}
                className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <div className="flex justify-between text-sm text-gray-400 mt-2">
                <span>1</span>
                <span className="font-bold text-blue-400">{values.top_n}</span>
                <span>20</span>
              </div>
              <ErrorMessage
                name="top_n"
                component="div"
                className="text-red-400 text-sm mt-1"
              />
            </div>

            {/* Max Chunks Per Doc */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Max Chunks Per Doc
              </label>
              <Field
                name="max_chunks_per_doc"
                type="range"
                min={1}
                max={50}
                className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <div className="flex justify-between text-sm text-gray-400 mt-2">
                <span>1</span>
                <span className="font-bold text-green-400">
                  {values.max_chunks_per_doc}
                </span>
                <span>50</span>
              </div>
              <ErrorMessage
                name="max_chunks_per_doc"
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
