// DocumentRerankerConfigForm.tsx
import React, { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  Settings,
  Filter,
  Key,
  Lock,
  DollarSign,
  BarChart3,
} from "lucide-react";
import { useUserCredentialStore } from "~/stores/userCredential";
import { getUserCredentialSecret } from "~/services/userCredentialService";
import type { DocumentRerankerConfigFormProps } from "./types";
import CredentialSelector from "~/components/credentials/CredentialSelector";

export default function DocumentRerankerConfigForm({
  initialValues,
  validate,
  onSubmit,
  onCancel,
}: DocumentRerankerConfigFormProps) {
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
          <Filter className="w-4 h-4 text-white" />
          <span className="text-white text-xs font-medium">
            Document Reranker
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
            {/* Strategy Selection */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Rerank Strategy
              </label>
              <Field
                as="select"
                name="rerank_strategy"
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                <option value="cohere">Cohere Rerank</option>
                <option value="hybrid">Hybrid Strategy</option>
                <option value="custom">Custom Strategy</option>
              </Field>
              <ErrorMessage
                name="rerank_strategy"
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
                          "cohere_api_key",
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
                    setFieldValue("cohere_api_key", "");
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
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
              />
              {loadingCredential && (
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-purple-400 text-xs">
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
                name="cohere_api_key"
                type="password"
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="cohere_api_key"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Initial K */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Initial K
              </label>
              <Field
                name="initial_k"
                type="number"
                min={1}
                max={100}
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="initial_k"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Final K */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Final K
              </label>
              <Field
                name="final_k"
                type="number"
                min={1}
                max={50}
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="final_k"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Hybrid Alpha */}
            {values.rerank_strategy === "hybrid" && (
              <div>
                <label className="text-white text-xs font-medium mb-1 block">
                  Hybrid Alpha
                </label>
                <Field
                  name="hybrid_alpha"
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-full text-white"
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                />
                <div className="flex justify-between text-xs text-gray-300 mt-1">
                  <span>0</span>
                  <span className="font-bold text-blue-400">
                    {values.hybrid_alpha || 0.5}
                  </span>
                  <span>1</span>
                </div>
                <ErrorMessage
                  name="hybrid_alpha"
                  component="div"
                  className="text-red-400 text-xs mt-1"
                />
              </div>
            )}

            {/* Enable Caching */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Enable Caching
              </label>
              <Field
                name="enable_caching"
                type="checkbox"
                className="text-xs text-white"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="enable_caching"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Similarity Threshold */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Similarity Threshold
              </label>
              <Field
                name="similarity_threshold"
                type="range"
                min={0}
                max={1}
                step={0.1}
                className="w-full text-white"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <div className="flex justify-between text-xs text-gray-300 mt-1">
                <span>0</span>
                <span className="font-bold text-green-400">
                  {values.similarity_threshold || 0.7}
                </span>
                <span>1</span>
              </div>
              <ErrorMessage
                name="similarity_threshold"
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
