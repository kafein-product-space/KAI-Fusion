// TavilyWebSearchConfigForm.tsx
import React, { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  Settings,
  Search,
  Key,
  Lock,
  Globe,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { useUserCredentialStore } from "~/stores/userCredential";
import { getUserCredentialSecret } from "~/services/userCredentialService";
import type { TavilyWebSearchConfigFormProps } from "./types";

export default function TavilyWebSearchConfigForm({
  initialValues,
  validate,
  onSubmit,
  onCancel,
}: TavilyWebSearchConfigFormProps) {
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
          <Search className="w-4 h-4 text-white" />
          <span className="text-white text-xs font-medium">
            Tavily Web Search
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
            {/* Search Type */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Search Type
              </label>
              <Field
                as="select"
                name="search_type"
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                <option value="basic">Basic Search</option>
                <option value="advanced">Advanced Search</option>
              </Field>
              <ErrorMessage
                name="search_type"
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
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
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
                          "tavily_api_key",
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
                    setFieldValue("tavily_api_key", "");
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
                name="tavily_api_key"
                type="password"
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="tavily_api_key"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Max Results */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Max Results
              </label>
              <Field
                name="max_results"
                type="number"
                min={1}
                max={20}
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="max_results"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Search Depth */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Search Depth
              </label>
              <Field
                as="select"
                name="search_depth"
                className="text-xs text-white px-2 py-1 rounded-lg w-full bg-slate-900/80 border"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              >
                <option value="basic">Basic</option>
                <option value="moderate">Moderate</option>
                <option value="advanced">Advanced</option>
              </Field>
              <ErrorMessage
                name="search_depth"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Include Answer */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Include Answer
              </label>
              <Field
                name="include_answer"
                type="checkbox"
                className="text-xs text-white"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="include_answer"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Include Raw Content */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Include Raw Content
              </label>
              <Field
                name="include_raw_content"
                type="checkbox"
                className="text-xs text-white"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="include_raw_content"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Include Images */}
            <div>
              <label className="text-white text-xs font-medium mb-1 block">
                Include Images
              </label>
              <Field
                name="include_images"
                type="checkbox"
                className="text-xs text-white"
                onMouseDown={(e: any) => e.stopPropagation()}
                onTouchStart={(e: any) => e.stopPropagation()}
              />
              <ErrorMessage
                name="include_images"
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
