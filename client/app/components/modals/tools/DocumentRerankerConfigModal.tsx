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
  Search,
  Settings,
  Key,
  Zap,
  Clock,
  Shield,
  Eye,
  Play,
  BarChart3,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Lock,
  Activity,
  Palette,
  Database,
  ArrowUpDown,
  FileText,
  Code,
  Target,
  TrendingUp,
  Cpu,
  DollarSign,
} from "lucide-react";

interface DocumentRerankerConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface DocumentRerankerConfig {
  rerank_strategy: string;
  cohere_api_key: string;
  initial_k: number;
  final_k: number;
  hybrid_alpha: number;
  enable_caching: boolean;
  similarity_threshold: number;
}

// Reranking Strategy Options with enhanced descriptions
const RERANKING_STRATEGIES = [
  {
    value: "cohere",
    label: "Cohere Rerank ⭐",
    description:
      "State-of-the-art neural reranking with Cohere API • Cost: $0.002/1K requests",
    icon: "🧠",
    color: "from-purple-500 to-pink-500",
    features: [
      "Highest quality",
      "Neural ranking",
      "Paid API",
      "Best accuracy",
    ],
  },
  {
    value: "bm25",
    label: "BM25 Statistical",
    description: "Classical BM25 statistical ranking (free, fast)",
    icon: "📊",
    color: "from-blue-500 to-cyan-500",
    features: ["Free", "Fast", "Statistical", "Classical approach"],
  },
  {
    value: "hybrid",
    label: "Hybrid (Vector + BM25) ⭐",
    description:
      "Combines vector similarity with BM25 statistical ranking (free)",
    icon: "⚡",
    color: "from-green-500 to-emerald-500",
    features: ["Free", "Balanced", "Best of both", "Recommended"],
  },
  {
    value: "no_rerank",
    label: "No Reranking",
    description: "Pass-through mode (original retriever order)",
    icon: "➡️",
    color: "from-gray-500 to-slate-500",
    features: ["Baseline", "No processing", "Original order", "Fastest"],
  },
];

const DocumentRerankerConfigModal = forwardRef<
  HTMLDialogElement,
  DocumentRerankerConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const { userCredentials, fetchCredentials, isLoading } =
    useUserCredentialStore();
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>("");
  const [loadingCredential, setLoadingCredential] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const initialValues: DocumentRerankerConfig = {
    rerank_strategy: nodeData?.rerank_strategy || "hybrid",
    cohere_api_key: nodeData?.cohere_api_key || "",
    initial_k: nodeData?.initial_k || 20,
    final_k: nodeData?.final_k || 6,
    hybrid_alpha: nodeData?.hybrid_alpha || 0.7,
    enable_caching: nodeData?.enable_caching !== false,
    similarity_threshold: nodeData?.similarity_threshold || 0.0,
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-bottom sm:modal-middle backdrop-blur-sm"
    >
      <div
        className="modal-box max-w-4xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
        border border-slate-700/50 shadow-2xl shadow-blue-500/10 backdrop-blur-xl"
      >
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-700/50">
          <div
            className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl 
            flex items-center justify-center shadow-lg"
          >
            <Search className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-white">
              Document Reranker Configuration
            </h3>
            <p className="text-slate-400 text-sm">
              Configure document ranking and retrieval strategies
            </p>
          </div>
        </div>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validate={(values) => {
            const errors: Record<string, string> = {};
            if (values.rerank_strategy === "cohere" && !values.cohere_api_key) {
              errors.cohere_api_key = "Cohere API key is required.";
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
              {/* Tab Navigation */}
              <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1">
                {[
                  { id: "basic", label: "Basic", icon: Settings },
                  { id: "advanced", label: "Advanced", icon: Zap },
                  { id: "credentials", label: "Credentials", icon: Key },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md 
                      transition-all duration-200 ${
                        activeTab === tab.id
                          ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg"
                          : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                      }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Basic Configuration Tab */}
              {activeTab === "basic" && (
                <div className="space-y-6">
                  {/* Reranking Strategy */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Target className="w-5 h-5 text-orange-400" />
                      <label className="text-white font-semibold">
                        Reranking Strategy
                      </label>
                    </div>

                    <div>
                      <label className="text-slate-300 text-sm mb-2 block">
                        Strategy Selection
                      </label>
                      <Field
                        as="select"
                        className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                          text-white px-4 py-3 focus:border-orange-500 focus:ring-2 
                          focus:ring-orange-500/20 transition-all"
                        name="rerank_strategy"
                      >
                        {RERANKING_STRATEGIES.map((strategy) => (
                          <option key={strategy.value} value={strategy.value}>
                            {strategy.icon} {strategy.label}
                          </option>
                        ))}
                      </Field>
                      <div className="mt-2 p-2 bg-slate-900/30 rounded text-xs text-slate-400">
                        {
                          RERANKING_STRATEGIES.find(
                            (s) => s.value === values.rerank_strategy
                          )?.description
                        }
                      </div>
                    </div>
                  </div>

                  {/* Strategy Features */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-green-400" />
                      <label className="text-white font-semibold">
                        Strategy Features
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {RERANKING_STRATEGIES.find(
                        (s) => s.value === values.rerank_strategy
                      )?.features.map((feature, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2 p-2 bg-slate-900/30 rounded"
                        >
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-slate-300 text-sm">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Retrieval Parameters */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <BarChart3 className="w-5 h-5 text-blue-400" />
                      <label className="text-white font-semibold">
                        Retrieval Parameters
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          Initial K:{" "}
                          <span className="text-blue-400 font-mono">
                            {values.initial_k}
                          </span>
                        </label>
                        <Field
                          type="range"
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                          name="initial_k"
                          min="5"
                          max="100"
                          step="5"
                        />
                        <div className="text-xs text-slate-400 mt-1">
                          Number of documents retrieved from base retriever
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          Final K:{" "}
                          <span className="text-purple-400 font-mono">
                            {values.final_k}
                          </span>
                        </label>
                        <Field
                          type="range"
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-purple-500
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                          name="final_k"
                          min="1"
                          max="20"
                          step="1"
                        />
                        <div className="text-xs text-slate-400 mt-1">
                          Number of documents returned after reranking
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reranking Information */}
                  <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl p-6 border border-orange-500/20">
                    <div className="flex items-center space-x-2 mb-4">
                      <Search className="w-5 h-5 text-orange-400" />
                      <label className="text-white font-semibold">
                        Reranking Information
                      </label>
                    </div>
                    <div className="text-xs text-slate-300 space-y-2">
                      <div className="flex items-start space-x-2">
                        <span className="text-orange-400">•</span>
                        <span>
                          Reranking improves document relevance and quality
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-orange-400">•</span>
                        <span>
                          Different strategies offer various trade-offs between
                          speed and quality
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-orange-400">•</span>
                        <span>
                          Hybrid approach combines the best of vector and
                          statistical ranking
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-orange-400">•</span>
                        <span>
                          Monitor performance and costs based on your use case
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced Configuration Tab */}
              {activeTab === "advanced" && (
                <div className="space-y-6">
                  {/* Hybrid Alpha Configuration */}
                  {values.rerank_strategy === "hybrid" && (
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                      <div className="flex items-center space-x-2 mb-4">
                        <Cpu className="w-5 h-5 text-green-400" />
                        <label className="text-white font-semibold">
                          Hybrid Alpha Configuration
                        </label>
                      </div>

                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          Hybrid Alpha:{" "}
                          <span className="text-green-400 font-mono">
                            {values.hybrid_alpha}
                          </span>
                        </label>
                        <Field
                          type="range"
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-green-500
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                          name="hybrid_alpha"
                          min="0.0"
                          max="1.0"
                          step="0.1"
                        />
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                          <span>BM25 Only</span>
                          <span>Balanced</span>
                          <span>Vector Only</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          0.0 = BM25 only, 1.0 = vector only, 0.7 = balanced
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Advanced Options */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      <label className="text-white font-semibold">
                        Advanced Options
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          Similarity Threshold:{" "}
                          <span className="text-yellow-400 font-mono">
                            {values.similarity_threshold}
                          </span>
                        </label>
                        <Field
                          type="range"
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-yellow-500
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                          name="similarity_threshold"
                          min="0.0"
                          max="1.0"
                          step="0.05"
                        />
                        <div className="text-xs text-slate-400 mt-1">
                          Minimum similarity threshold for documents
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-600/20">
                        <div className="flex items-center space-x-3">
                          <div className="text-slate-400">
                            <Database className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-white text-sm font-medium">
                              Enable Caching
                            </div>
                            <div className="text-slate-400 text-xs">
                              Cache reranking results for repeated queries
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <Field
                              type="checkbox"
                              name="enable_caching"
                              className="sr-only peer"
                            />
                            <div
                              className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer 
                              peer-checked:after:translate-x-full peer-checked:after:border-white 
                              after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                              after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all 
                              peer-checked:bg-gradient-to-r peer-checked:from-yellow-500 peer-checked:to-orange-600"
                            ></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Performance Guidelines */}
                  <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-6 border border-green-500/20">
                    <div className="flex items-center space-x-2 mb-4">
                      <Activity className="w-5 h-5 text-green-400" />
                      <label className="text-white font-semibold">
                        Performance Guidelines
                      </label>
                    </div>
                    <div className="text-xs text-slate-300 space-y-2">
                      <div className="flex items-start space-x-2">
                        <span className="text-green-400">•</span>
                        <span>
                          Higher Initial K improves recall but increases
                          processing time
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-green-400">•</span>
                        <span>
                          Lower Final K improves precision but may miss relevant
                          documents
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-green-400">•</span>
                        <span>
                          Enable caching for repeated queries to improve
                          performance
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-green-400">•</span>
                        <span>
                          Monitor similarity thresholds to balance relevance and
                          coverage
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Credentials Tab */}
              {activeTab === "credentials" && (
                <div className="space-y-6">
                  {/* Cohere API Configuration */}
                  {values.rerank_strategy === "cohere" && (
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                      <div className="flex items-center space-x-2 mb-4">
                        <Key className="w-5 h-5 text-purple-400" />
                        <label className="text-white font-semibold">
                          Cohere API Configuration
                        </label>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-slate-300 text-sm mb-2 block">
                            Select Credential (Optional)
                          </label>
                          <select
                            className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                              text-white px-4 py-3 focus:border-purple-500 focus:ring-2 
                              focus:ring-purple-500/20 transition-all"
                            value={selectedCredentialId}
                            onChange={async (e) => {
                              const credId = e.target.value;
                              setSelectedCredentialId(credId);
                              if (credId) {
                                setLoadingCredential(true);
                                try {
                                  const result = await getUserCredentialSecret(
                                    credId
                                  );
                                  if (result?.secret?.api_key) {
                                    setFieldValue(
                                      "cohere_api_key",
                                      result.secret.api_key
                                    );
                                  }
                                } finally {
                                  setLoadingCredential(false);
                                }
                              } else {
                                setFieldValue("cohere_api_key", "");
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
                            <div className="flex items-center space-x-2 mt-2">
                              <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                              <span className="text-purple-400 text-sm">
                                Loading credential...
                              </span>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="text-slate-300 text-sm mb-2 block">
                            Cohere API Key
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Field
                              className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                                text-white pl-10 pr-4 py-3 focus:border-purple-500 focus:ring-2 
                                focus:ring-purple-500/20 transition-all"
                              type="password"
                              name="cohere_api_key"
                              placeholder="your-cohere-api-key"
                              value={values.cohere_api_key}
                            />
                          </div>
                          <ErrorMessage
                            name="cohere_api_key"
                            component="div"
                            className="text-red-400 text-sm mt-2"
                          />
                        </div>
                      </div>

                      <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-600/30">
                        <div className="flex items-center space-x-2 mb-2">
                          <DollarSign className="w-4 h-4 text-yellow-400" />
                          <span className="text-slate-300 text-sm font-medium">
                            Cost Information
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 space-y-1">
                          <div>• Cohere Rerank: $0.002 per 1K requests</div>
                          <div>• Monitor usage to control costs</div>
                          <div>
                            • Consider hybrid strategy for cost optimization
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Strategy Comparison */}
                  <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl p-6 border border-blue-500/20">
                    <div className="flex items-center space-x-2 mb-4">
                      <BarChart3 className="w-5 h-5 text-blue-400" />
                      <label className="text-white font-semibold">
                        Strategy Comparison
                      </label>
                    </div>
                    <div className="text-xs text-slate-300 space-y-2">
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-400">•</span>
                        <span>
                          <strong>Cohere:</strong> Best quality, paid API
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-400">•</span>
                        <span>
                          <strong>BM25:</strong> Fast, free, statistical
                          approach
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-400">•</span>
                        <span>
                          <strong>Hybrid:</strong> Balanced, free, recommended
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-400">•</span>
                        <span>
                          <strong>No Rerank:</strong> Baseline comparison
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-slate-700/50">
                <button
                  type="button"
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg 
                    border border-slate-600 transition-all duration-200 hover:scale-105
                    flex items-center space-x-2"
                  onClick={() => dialogRef.current?.close()}
                  disabled={isSubmitting}
                >
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-600 
                    hover:from-orange-400 hover:to-red-500 text-white rounded-lg 
                    shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105
                    flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default DocumentRerankerConfigModal;
