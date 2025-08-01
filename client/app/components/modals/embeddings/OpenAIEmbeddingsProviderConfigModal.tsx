import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { useUserCredentialStore } from "~/stores/userCredential";
import { getUserCredentialSecret } from "~/services/userCredentialService";
import { Brain, Key, Lock, Settings, CheckCircle, Globe } from "lucide-react";

interface OpenAIEmbeddingsProviderConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface OpenAIEmbeddingsProviderConfig {
  model: string;
  api_key: string;
  organization: string;
  batch_size: number;
  cache_enabled: boolean;
}

const EMBEDDING_MODELS = [
  {
    value: "text-embedding-3-small",
    label: "Text Embedding 3 Small ⭐",
    description:
      "Latest small model, best performance/cost ratio • 1536D • $0.00002/1K tokens",
  },
  {
    value: "text-embedding-3-large",
    label: "Text Embedding 3 Large",
    description:
      "Latest large model, highest quality embeddings • 3072D • $0.00013/1K tokens",
  },
  {
    value: "text-embedding-ada-002",
    label: "Text Embedding Ada 002 (Legacy)",
    description: "Legacy model, still reliable • 1536D • $0.0001/1K tokens",
  },
];

const OpenAIEmbeddingsProviderConfigModal = forwardRef<
  HTMLDialogElement,
  OpenAIEmbeddingsProviderConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const { userCredentials, fetchCredentials, isLoading } =
    useUserCredentialStore();
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>("");
  const [loadingCredential, setLoadingCredential] = useState(false);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const initialValues: OpenAIEmbeddingsProviderConfig = {
    model: nodeData?.model || "text-embedding-3-small",
    api_key: nodeData?.api_key || "",
    organization: nodeData?.organization || "",
    batch_size: nodeData?.batch_size || 100,
    cache_enabled: nodeData?.cache_enabled !== false,
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-bottom sm:modal-middle backdrop-blur-sm"
    >
      <div className="modal-box max-w-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl shadow-cyan-500/10">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-700/50">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-white">
              OpenAI Embeddings Provider
            </h3>
            <p className="text-slate-400 text-sm">
              Configure OpenAI API for generating embeddings
            </p>
          </div>
        </div>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validate={(values) => {
            const errors: Record<string, string> = {};
            if (!values.api_key) {
              errors.api_key = "OpenAI API key is required.";
            }
            return errors;
          }}
          onSubmit={(values, { setSubmitting }) => {
            onSave(values);
            dialogRef.current?.close();
            setSubmitting(false);
          }}
        >
          {({ isSubmitting, setFieldValue, values }) => (
            <Form className="space-y-6">
              {/* API Credential Section */}
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                <label className="text-white font-semibold flex items-center space-x-2 mb-4">
                  <Key className="w-5 h-5 text-cyan-400" />
                  <span>API Credentials</span>
                </label>

                {/* Credential Selector */}
                <select
                  className="select w-full bg-slate-900/80 text-white border border-slate-600/50 rounded-lg mb-4"
                  value={selectedCredentialId}
                  onChange={async (e) => {
                    const credId = e.target.value;
                    setSelectedCredentialId(credId);
                    if (credId) {
                      setLoadingCredential(true);
                      try {
                        const result = await getUserCredentialSecret(credId);
                        if (result?.secret?.api_key) {
                          setFieldValue("api_key", result.secret.api_key);
                          if (result.secret.organization) {
                            setFieldValue(
                              "organization",
                              result.secret.organization
                            );
                          }
                        }
                      } finally {
                        setLoadingCredential(false);
                      }
                    } else {
                      setFieldValue("api_key", "");
                      setFieldValue("organization", "");
                    }
                  }}
                  disabled={isLoading || loadingCredential}
                >
                  <option value="">Choose a saved credential...</option>
                  {userCredentials.map((cred) => (
                    <option key={cred.id} value={cred.id}>
                      {cred.name}
                    </option>
                  ))}
                </select>

                {loadingCredential && (
                  <div className="flex items-center space-x-2 text-sm text-cyan-400 mb-4">
                    <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading credential...</span>
                  </div>
                )}

                {/* API Key Input */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-300 text-sm mb-2 block">
                      API Key *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Field
                        className="input w-full bg-slate-900/80 text-white pl-10 pr-4 py-3 rounded-lg border border-slate-600/50 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                        type="password"
                        name="api_key"
                        placeholder="sk-..."
                      />
                    </div>
                    <ErrorMessage
                      name="api_key"
                      component="div"
                      className="text-red-400 text-sm mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 text-sm mb-2 block">
                      Organization (Optional)
                    </label>
                    <Field
                      className="input w-full bg-slate-900/80 text-white py-3 rounded-lg border border-slate-600/50 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                      type="text"
                      name="organization"
                      placeholder="org-..."
                    />
                  </div>
                </div>
              </div>

              {/* Model Configuration */}
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                <label className="text-white font-semibold flex items-center space-x-2 mb-4">
                  <Settings className="w-5 h-5 text-purple-400" />
                  <span>Model Settings</span>
                </label>

                <div className="space-y-4">
                  <div>
                    <label className="text-slate-300 text-sm mb-2 block">
                      Embedding Model
                    </label>
                    <Field
                      as="select"
                      className="select w-full bg-slate-900/80 text-white border border-slate-600/50 rounded-lg"
                      name="model"
                    >
                      {EMBEDDING_MODELS.map((model) => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))}
                    </Field>

                    <div className="mt-2 text-xs text-slate-400">
                      {
                        EMBEDDING_MODELS.find((m) => m.value === values.model)
                          ?.description
                      }
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 text-sm flex items-center gap-2 mb-2">
                      Batch Size:
                      <span className="text-cyan-400 font-mono ml-auto">
                        {values.batch_size}
                      </span>
                    </label>
                    <Field
                      type="range"
                      name="batch_size"
                      min={10}
                      max={500}
                      step="10"
                      className="w-full accent-cyan-500"
                    />
                    <div className="text-slate-400 text-xs mt-1">
                      Number of texts to process in one batch (10-500)
                    </div>
                  </div>
                </div>
              </div>

              {/* Simple Options */}
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                <label className="text-white font-semibold flex items-center space-x-2 mb-4">
                  <Globe className="w-5 h-5 text-green-400" />
                  <span>Options</span>
                </label>

                <label className="flex items-center justify-between p-4 bg-slate-900/30 rounded-lg border border-slate-600/20 hover:border-slate-500/40 transition-colors cursor-pointer">
                  <div>
                    <div className="text-white text-sm font-medium">
                      Enable Caching
                    </div>
                    <div className="text-slate-400 text-xs">
                      Cache embeddings to reduce API calls and costs
                    </div>
                  </div>
                  <Field
                    type="checkbox"
                    name="cache_enabled"
                    className="toggle toggle-primary"
                  />
                </label>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-slate-700/50">
                <button
                  type="button"
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg 
                    border border-slate-600 transition-all duration-200 hover:scale-105"
                  onClick={() => dialogRef.current?.close()}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 
                    hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg 
                    shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105
                    flex items-center space-x-2 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Save Configuration</span>
                    </>
                  )}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </dialog>
  );
});

export default OpenAIEmbeddingsProviderConfigModal;
