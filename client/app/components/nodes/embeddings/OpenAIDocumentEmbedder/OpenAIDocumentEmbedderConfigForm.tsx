// OpenAIDocumentEmbedderConfigForm.tsx
import React, { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  Settings,
  FileText,
  Key,
  Lock,
  Globe,
  Sparkles,
  BarChart3,
  Database,
  Zap,
  Brain,
} from "lucide-react";
import { useUserCredentialStore } from "~/stores/userCredential";
import { getUserCredentialSecret } from "~/services/userCredentialService";
import type { OpenAIDocumentEmbedderConfigFormProps } from "./types";
import CredentialSelector from "~/components/credentials/CredentialSelector";

export default function OpenAIDocumentEmbedderConfigForm({
  initialValues,
  validate,
  onSubmit,
  onCancel,
}: OpenAIDocumentEmbedderConfigFormProps) {
  const { userCredentials, fetchCredentials } = useUserCredentialStore();
  const [loadingCredential, setLoadingCredential] = useState(false);

  // Fetch credentials on component mount
  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  return (
    <div className="relative p-2 w-80 h-auto min-h-32 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl border border-white/20 backdrop-blur-sm">
      <div className="flex items-center justify-between w-full px-3 py-2 border-b border-white/20">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-white" />
          <span className="text-white text-xs font-medium">
            OpenAI Document Embedder
          </span>
        </div>
        <Settings className="w-4 h-4 text-white" />
      </div>

      <Formik
        initialValues={initialValues}
        validate={validate}
        onSubmit={onSubmit}
        enableReinitialize
      >
        {({ values, errors, touched, isSubmitting, setFieldValue }) => (
          <Form className="space-y-3 w-full p-3">
            {/* Embedding Model Selection */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Embedding Model
              </label>
              <Field
                as="select"
                name="embedding_model"
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
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
                name="embedding_model"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Credential ID */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
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
              {loadingCredential && (
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-blue-400 text-xs">
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

            {/* Organization */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Organization (Optional)
              </label>
              <Field
                name="organization"
                type="text"
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
                placeholder="org-..."
              />
              <ErrorMessage
                name="organization"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Chunk Size */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Chunk Size
              </label>
              <Field
                name="chunk_size"
                type="number"
                min={100}
                max={4000}
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="chunk_size"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Chunk Overlap */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Chunk Overlap
              </label>
              <Field
                name="chunk_overlap"
                type="number"
                min={0}
                max={2000}
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="chunk_overlap"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Batch Size */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Batch Size
              </label>
              <Field
                name="batch_size"
                type="number"
                min={1}
                max={100}
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="batch_size"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Max Retries */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Max Retries
              </label>
              <Field
                name="max_retries"
                type="number"
                min={0}
                max={10}
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="max_retries"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Embedding Dimensions (Auto-calculated based on model) */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Embedding Dimensions
              </label>
              <Field
                name="embedding_dimensions"
                type="number"
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
                readOnly
              />
              <div className="text-xs text-gray-400 mt-1">
                Auto-calculated based on model selection
              </div>
              <ErrorMessage
                name="embedding_dimensions"
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
