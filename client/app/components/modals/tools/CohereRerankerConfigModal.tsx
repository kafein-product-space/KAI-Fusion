import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
} from "react";
import { Formik, Form, Field } from "formik";
import { Key, Settings, Filter, Zap, Database, Plus } from "lucide-react";
import { useUserCredentialStore } from "~/stores/userCredential";

interface CohereRerankerConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface CohereRerankerConfig {
  cohere_api_key: string;
  credential_id?: string;
  model: string;
  top_n: number;
  max_chunks_per_doc: number;
}

const rerankModels = [
  {
    value: "rerank-english-v3.0",
    label: "Rerank English v3.0",
    description: "Latest English model, best performance for English text",
  },
  {
    value: "rerank-multilingual-v3.0",
    label: "Rerank Multilingual v3.0",
    description: "Latest multilingual model, supports 100+ languages",
  },
  {
    value: "rerank-english-v2.0",
    label: "Rerank English v2.0",
    description: "Previous generation English model",
  },
  {
    value: "rerank-multilingual-v2.0",
    label: "Rerank Multilingual v2.0",
    description: "Previous generation multilingual model",
  },
];

const CohereRerankerConfigModal = forwardRef<
  HTMLDialogElement,
  CohereRerankerConfigModalProps
>(({ nodeData, onSave }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { userCredentials, fetchCredentials } = useUserCredentialStore();
  const [selectedCredential, setSelectedCredential] = useState<string>("");
  const [useCredential, setUseCredential] = useState(false);

  useImperativeHandle(ref, () => dialogRef.current!);

  // Fetch credentials on component mount
  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  // Use all credentials instead of filtering by service_type
  const allCredentials = userCredentials;

  const initialValues: CohereRerankerConfig = {
    cohere_api_key: nodeData?.cohere_api_key || "",
    credential_id: nodeData?.credential_id || "",
    model: nodeData?.model || "rerank-english-v3.0",
    top_n: nodeData?.top_n || 5,
    max_chunks_per_doc: nodeData?.max_chunks_per_doc || 10,
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-bottom sm:modal-middle backdrop-blur-sm"
    >
      <div className="modal-box max-w-4xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl shadow-purple-500/10 backdrop-blur-xl">
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-700/50">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
            <Filter className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-white">
              Cohere Reranker Provider
            </h3>
            <p className="text-slate-400 text-sm">
              Configure your Cohere reranking model and settings
            </p>
          </div>
        </div>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          onSubmit={(values, { setSubmitting }) => {
            onSave(values);
            dialogRef.current?.close();
            setSubmitting(false);
          }}
        >
          {({ isSubmitting, values, setFieldValue }) => (
            <Form className="space-y-6">
              {/* API Configuration */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-4">
                  <Key className="w-5 h-5 text-orange-400" />
                  <h4 className="text-white font-semibold">
                    API Configuration
                  </h4>
                </div>

                <div className="space-y-4">
                  {/* Credential Selection Toggle */}
                  <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-600/20">
                    <div className="flex items-center space-x-3">
                      <Database className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-white text-sm font-medium">
                          Use Saved Credential
                        </div>
                        <div className="text-slate-400 text-xs">
                          Select from your saved credentials
                        </div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useCredential}
                        onChange={(e) => {
                          setUseCredential(e.target.checked);
                          if (!e.target.checked) {
                            setFieldValue("credential_id", "");
                            setSelectedCredential("");
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-orange-500 peer-checked:to-red-600"></div>
                    </label>
                  </div>

                  {/* Credential Selection */}
                  {useCredential && (
                    <div>
                      <label className="text-white font-semibold mb-2 block">
                        Select Credential
                      </label>
                      <select
                        value={selectedCredential}
                        onChange={(e) => {
                          setSelectedCredential(e.target.value);
                          setFieldValue("credential_id", e.target.value);
                          setFieldValue("cohere_api_key", "");
                        }}
                        className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg text-white px-4 py-3 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                      >
                        <option value="">Select a credential...</option>
                        {allCredentials.map((cred) => (
                          <option key={cred.id} value={cred.id}>
                            {cred.name} ({cred.service_type})
                          </option>
                        ))}
                      </select>
                      <div className="text-xs text-slate-400 mt-2">
                        {allCredentials.length === 0
                          ? "No credentials found. Add credentials in the Credentials section."
                          : "Choose from your saved credentials"}
                      </div>
                    </div>
                  )}

                  {/* Manual API Key Input */}
                  {!useCredential && (
                    <div>
                      <label className="text-white font-semibold mb-2 block">
                        Cohere API Key
                      </label>
                      <Field
                        name="cohere_api_key"
                        type="password"
                        placeholder="your-cohere-api-key"
                        className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg text-white px-4 py-3 placeholder-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
                      />
                      <div className="text-xs text-slate-400 mt-2">
                        Your Cohere API key for authentication
                      </div>
                    </div>
                  )}

                  {/* Add New Credential Link */}
                  {useCredential && allCredentials.length === 0 && (
                    <div className="flex items-center space-x-2 p-3 bg-slate-900/30 rounded-lg border border-slate-600/20">
                      <Plus className="w-4 h-4 text-orange-400" />
                      <span className="text-orange-400 text-sm">
                        No credentials found.{" "}
                        <button
                          type="button"
                          className="underline hover:text-orange-300"
                          onClick={() => {
                            // Navigate to credentials page or open credential modal
                            window.location.href = "/credentials";
                          }}
                        >
                          Add credentials
                        </button>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Model Configuration */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-4">
                  <Filter className="w-5 h-5 text-blue-400" />
                  <h4 className="text-white font-semibold">
                    Model Configuration
                  </h4>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-white font-semibold mb-2 block">
                      Rerank Model
                    </label>
                    <Field name="model">
                      {({ field }: any) => (
                        <select
                          {...field}
                          className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg text-white px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        >
                          {rerankModels.map((model) => (
                            <option key={model.value} value={model.value}>
                              {model.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </Field>
                    <div className="text-xs text-slate-400 mt-2">
                      {
                        rerankModels.find((m) => m.value === values.model)
                          ?.description
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Configuration */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-4">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  <h4 className="text-white font-semibold">
                    Performance Configuration
                  </h4>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-white font-semibold mb-2 block">
                      Top N Results: {values.top_n}
                    </label>
                    <Field name="top_n">
                      {({ field }: any) => (
                        <input
                          {...field}
                          type="range"
                          min="1"
                          max="50"
                          className="range range-warning w-full"
                        />
                      )}
                    </Field>
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>1</span>
                      <span className="font-bold text-white">
                        {values.top_n}
                      </span>
                      <span>50</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-2">
                      Number of top results to return after reranking
                    </div>
                  </div>

                  <div>
                    <label className="text-white font-semibold mb-2 block">
                      Max Chunks Per Document: {values.max_chunks_per_doc}
                    </label>
                    <Field name="max_chunks_per_doc">
                      {({ field }: any) => (
                        <input
                          {...field}
                          type="range"
                          min="1"
                          max="100"
                          className="range range-info w-full"
                        />
                      )}
                    </Field>
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>1</span>
                      <span className="font-bold text-white">
                        {values.max_chunks_per_doc}
                      </span>
                      <span>100</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-2">
                      Maximum number of chunks to process per document
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-6 border-t border-slate-700/50">
                <button
                  type="button"
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg border border-slate-600 transition-all duration-200 hover:scale-105 flex items-center space-x-2"
                  onClick={() => dialogRef.current?.close()}
                  disabled={isSubmitting}
                >
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Settings className="w-4 h-4" />
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

export default CohereRerankerConfigModal;
