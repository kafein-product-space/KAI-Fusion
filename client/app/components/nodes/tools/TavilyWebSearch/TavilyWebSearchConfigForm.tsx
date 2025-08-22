// TavilyWebSearchConfigForm.tsx
import React, { useState } from "react";
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
import CredentialSelector from "~/components/credentials/CredentialSelector";
// Standard props interface matching other config forms
interface TavilyWebSearchConfigFormProps {
  configData: any;
  onSave: (values: any) => void;
  onCancel: () => void;
}

export default function TavilyWebSearchConfigForm({
  configData,
  onSave,
  onCancel,
}: TavilyWebSearchConfigFormProps) {
  
  // Default values for missing fields
  const initialValues = {
    search_type: configData?.search_type || "basic",
    credential_id: configData?.credential_id || "",
    tavily_api_key: configData?.tavily_api_key || "",
    max_results: configData?.max_results || 5,
    search_depth: configData?.search_depth || "basic",
    include_answer: configData?.include_answer ?? true,
    include_raw_content: configData?.include_raw_content ?? false,
    include_images: configData?.include_images ?? false,
  };

  // Validation function
  const validate = (values: any) => {
    const errors: any = {};
    if (!values.tavily_api_key) {
      errors.tavily_api_key = "API key is required";
    }
    if (!values.search_type) {
      errors.search_type = "Search type is required";
    }
    if (!values.max_results || values.max_results < 1 || values.max_results > 20) {
      errors.max_results = "Max results must be between 1 and 20";
    }
    if (!values.search_depth) {
      errors.search_depth = "Search depth is required";
    }
    return errors;
  };
  const { userCredentials, fetchCredentials } = useUserCredentialStore();
  const [loadingCredential, setLoadingCredential] = useState(false);

  // Fetch credentials on component mount
  // useEffect(() => {
  //   fetchCredentials();
  // }, [fetchCredentials]);

  return (
    <div className="relative w-full h-auto rounded-2xl flex flex-col bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl border border-white/20 backdrop-blur-sm">
      <div className="flex items-center justify-between w-full px-6 py-4 border-b border-white/20">
        <div className="flex items-center gap-3">
          <Search className="w-6 h-6 text-white" />
          <span className="text-white text-lg font-medium">
            Tavily Web Search Configuration
          </span>
        </div>
        <Settings className="w-6 h-6 text-white" />
      </div>

      <Formik
        initialValues={initialValues}
        validate={validate}
        onSubmit={onSave}
        enableReinitialize
      >
        {({ values, errors, touched, isSubmitting, setFieldValue }) => (
          <Form className="space-y-6 w-full p-6">
            {/* Search Type */}
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                Search Type
              </label>
              <Field
                as="select"
                name="search_type"
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
              <label className="text-white text-sm font-medium mb-2 block">
                Select Credential
              </label>
              <CredentialSelector
                value={values.credential_id}
                onChange={async (credentialId) => {
                  setFieldValue("credential_id", credentialId);

                  // Auto-fill API key from selected credential
                  if (credentialId) {
                    setLoadingCredential(true);
                    try {
                      const credentialSecret = await getUserCredentialSecret(
                        credentialId
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
                onCredentialLoad={(secret) => {
                  if (secret?.api_key) {
                    setFieldValue("tavily_api_key", secret.api_key);
                  }
                }}
                serviceType="tavily_search"
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
                name="tavily_api_key"
                type="password"
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
              <label className="text-white text-sm font-medium mb-2 block">
                Max Results
              </label>
              <Field
                name="max_results"
                type="number"
                min={1}
                max={20}
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
              <label className="text-white text-sm font-medium mb-2 block">
                Search Depth
              </label>
              <Field
                as="select"
                name="search_depth"
                className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
              <label className="text-white text-sm font-medium mb-3 flex items-center gap-3">
                <Field
                  name="include_answer"
                  type="checkbox"
                  className="w-5 h-5 text-blue-600 bg-slate-900/80 border border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                />
                <span>Include Answer</span>
              </label>
              <div className="text-sm text-gray-400 ml-8">
                Include direct answers from Tavily
              </div>
              <ErrorMessage
                name="include_answer"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Include Raw Content */}
            <div>
              <label className="text-white text-sm font-medium mb-3 flex items-center gap-3">
                <Field
                  name="include_raw_content"
                  type="checkbox"
                  className="w-5 h-5 text-blue-600 bg-slate-900/80 border border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                />
                <span>Include Raw Content</span>
              </label>
              <div className="text-sm text-gray-400 ml-8">
                Include raw HTML content from pages
              </div>
              <ErrorMessage
                name="include_raw_content"
                component="div"
                className="text-red-400 text-xs mt-1"
              />
            </div>

            {/* Include Images */}
            <div>
              <label className="text-white text-sm font-medium mb-3 flex items-center gap-3">
                <Field
                  name="include_images"
                  type="checkbox"
                  className="w-5 h-5 text-blue-600 bg-slate-900/80 border border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                  onMouseDown={(e: any) => e.stopPropagation()}
                  onTouchStart={(e: any) => e.stopPropagation()}
                />
                <span>Include Images</span>
              </label>
              <div className="text-sm text-gray-400 ml-8">
                Include image URLs in search results
              </div>
              <ErrorMessage
                name="include_images"
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
