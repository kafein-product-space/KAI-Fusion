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
import {
  Brain,
  Key,
  Lock,
  Settings,
  BarChart3,
  Sliders,
  CheckCircle,
  Activity,
} from "lucide-react";

interface OpenAIDocumentEmbedderConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface OpenAIDocumentEmbedderConfig {
  embed_model: string;
  openai_api_key: string;
  batch_size: number;
  max_retries: number;
  request_timeout: number;
  include_metadata_in_embedding: boolean;
  normalize_vectors: boolean;
  enable_cost_estimation: boolean;
}

const EMBEDDING_MODELS = [
  {
    value: "text-embedding-3-small",
    label: "Text Embedding 3 Small ⭐",
    description:
      "Latest small model, good performance/cost ratio • 1536D • $0.00002/1K tokens",
  },
  {
    value: "text-embedding-3-large",
    label: "Text Embedding 3 Large",
    description:
      "Latest large model, highest quality embeddings • 3072D • $0.00013/1K tokens",
  },
  {
    value: "text-embedding-ada-002",
    label: "Text Embedding Ada 002",
    description: "Legacy model, still reliable • 1536D • $0.0001/1K tokens",
  },
];

const OpenAIDocumentEmbedderConfigModal = forwardRef<
  HTMLDialogElement,
  OpenAIDocumentEmbedderConfigModalProps
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

  const initialValues: OpenAIDocumentEmbedderConfig = {
    embed_model: nodeData?.embed_model || "text-embedding-3-small",
    openai_api_key: nodeData?.openai_api_key || "",
    batch_size: nodeData?.batch_size || 100,
    max_retries: nodeData?.max_retries || 3,
    request_timeout: nodeData?.request_timeout || 60,
    include_metadata_in_embedding:
      nodeData?.include_metadata_in_embedding || false,
    normalize_vectors: nodeData?.normalize_vectors !== false,
    enable_cost_estimation: nodeData?.enable_cost_estimation !== false,
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-bottom sm:modal-middle backdrop-blur-sm"
    >
      <div className="modal-box max-w-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl shadow-purple-500/10">
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-700/50">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-white">Document Embedder</h3>
            <p className="text-slate-400 text-sm">
              Configure OpenAI-based document embedding pipeline
            </p>
          </div>
        </div>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validate={(values) => {
            const errors: Record<string, string> = {};
            if (!values.openai_api_key) {
              errors.openai_api_key = "OpenAI API key is required.";
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
              {/* Credential Section */}
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                <label className="text-white font-semibold flex items-center space-x-2 mb-4">
                  <Key className="w-5 h-5 text-emerald-400" />
                  <span>API Credential</span>
                </label>

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
                          setFieldValue(
                            "openai_api_key",
                            result.secret.api_key
                          );
                        }
                      } finally {
                        setLoadingCredential(false);
                      }
                    } else {
                      setFieldValue("openai_api_key", "");
                    }
                  }}
                  disabled={isLoading || loadingCredential}
                >
                  <option value="">Choose a credential...</option>
                  {userCredentials.map((cred) => (
                    <option key={cred.id} value={cred.id}>
                      {cred.name}
                    </option>
                  ))}
                </select>

                {loadingCredential && (
                  <div className="text-sm text-emerald-400">
                    Loading credential...
                  </div>
                )}

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Field
                    className="input w-full bg-slate-900/80 text-white pl-10 pr-4 py-3 rounded-lg border border-slate-600/50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    type="password"
                    name="openai_api_key"
                    placeholder="sk-..."
                  />
                </div>
                <ErrorMessage
                  name="openai_api_key"
                  component="div"
                  className="text-red-400 text-sm mt-2"
                />
              </div>

              {/* Model Selection */}
              <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                <label className="text-white font-semibold flex items-center space-x-2 mb-4">
                  <Settings className="w-5 h-5 text-purple-400" />
                  <span>Embedding Model</span>
                </label>

                <Field
                  as="select"
                  className="select w-full bg-slate-900/80 text-white border border-slate-600/50 rounded-lg"
                  name="embed_model"
                >
                  {EMBEDDING_MODELS.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </Field>

                <div className="mt-2 text-xs text-slate-400">
                  {
                    EMBEDDING_MODELS.find((m) => m.value === values.embed_model)
                      ?.description
                  }
                </div>
              </div>

              {/* Advanced Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    label: "Batch Size",
                    name: "batch_size",
                    min: 10,
                    max: 500,
                    icon: <Sliders className="w-4 h-4" />,
                  },
                  {
                    label: "Max Retries",
                    name: "max_retries",
                    min: 0,
                    max: 5,
                    icon: <Activity className="w-4 h-4" />,
                  },
                  {
                    label: "Timeout (s)",
                    name: "request_timeout",
                    min: 10,
                    max: 300,
                    icon: <BarChart3 className="w-4 h-4" />,
                  },
                ].map(({ label, name, min, max, icon }) => (
                  <div
                    key={name}
                    className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50"
                  >
                    <label className="text-slate-300 text-sm flex items-center gap-2 mb-2">
                      {icon} {label}:{" "}
                      <span className="text-orange-400 font-mono ml-auto">
                        {values[name as keyof typeof values]}
                      </span>
                    </label>
                    <Field
                      type="range"
                      name={name}
                      min={min}
                      max={max}
                      step="1"
                      className="w-full"
                    />
                  </div>
                ))}
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {[
                  {
                    name: "include_metadata_in_embedding",
                    label: "Include Metadata",
                    description: "Append metadata to text before embedding",
                  },
                  {
                    name: "normalize_vectors",
                    label: "Normalize Vectors",
                    description: "Make embeddings unit length",
                  },
                  {
                    name: "enable_cost_estimation",
                    label: "Estimate Cost",
                    description: "Calculate and show OpenAI embedding cost",
                  },
                ].map(({ name, label, description }) => (
                  <label
                    key={name}
                    className="flex items-center justify-between p-4 bg-slate-900/30 rounded-lg border border-slate-600/20"
                  >
                    <div>
                      <div className="text-white text-sm font-medium">
                        {label}
                      </div>
                      <div className="text-slate-400 text-xs">
                        {description}
                      </div>
                    </div>
                    <Field
                      type="checkbox"
                      name={name}
                      className="toggle toggle-primary"
                    />
                  </label>
                ))}
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-slate-700/50">
                <button
                  type="button"
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg border border-slate-600 transition-all hover:scale-105"
                  onClick={() => dialogRef.current?.close()}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Save Configuration"}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </dialog>
  );
});

export default OpenAIDocumentEmbedderConfigModal;
