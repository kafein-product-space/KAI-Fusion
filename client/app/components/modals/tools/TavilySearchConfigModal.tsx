import {
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
  Globe,
  FileText,
  Code,
  Target,
  TrendingUp,
  Cpu,
  DollarSign,
  Search as SearchIcon,
  Globe as GlobeIcon,
  Zap as ZapIcon,
} from "lucide-react";

interface TavilySearchConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface TavilySearchConfig {
  tavily_api_key: string;
}

// Tavily Search Features
const TAVILY_FEATURES = [
  {
    name: "Real-time Search",
    description: "Access to live, up-to-date information from across the web",
    icon: GlobeIcon,
    color: "text-blue-400",
  },
  {
    name: "AI-Powered Results",
    description: "Intelligent search results with context-aware ranking",
    icon: SearchIcon,
    color: "text-purple-400",
  },
  {
    name: "Fast Performance",
    description: "Quick response times for real-time information retrieval",
    icon: ZapIcon,
    color: "text-green-400",
  },
  {
    name: "Comprehensive Coverage",
    description: "Access to billions of web pages and documents",
    icon: Database,
    color: "text-orange-400",
  },
];

const TavilySearchConfigModal = forwardRef<
  HTMLDialogElement,
  TavilySearchConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const { userCredentials, fetchCredentials, isLoading } =
    useUserCredentialStore();
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>("");
  const [loadingCredential, setLoadingCredential] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  const initialValues: TavilySearchConfig = {
    tavily_api_key: nodeData?.tavily_api_key || "",
  };

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

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
            className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl 
            flex items-center justify-center shadow-lg"
          >
            <Search className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-white">
              Tavily Search Configuration
            </h3>
            <p className="text-slate-400 text-sm">
              Configure AI-powered web search capabilities
            </p>
          </div>
        </div>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validate={(values) => {
            const errors: Record<string, string> = {};
            if (!values.tavily_api_key) {
              errors.tavily_api_key = "API key is required";
            }
            return errors;
          }}
          onSubmit={(values, { setSubmitting }) => {
            onSave(values);
            dialogRef.current?.close();
            setSubmitting(false);
          }}
        >
          {({ values, setFieldValue, isSubmitting }) => (
            <Form className="space-y-6">
              {/* Tab Navigation */}
              <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1">
                {[
                  { id: "basic", label: "Basic", icon: Settings },
                  { id: "credentials", label: "Credentials", icon: Key },
                  { id: "features", label: "Features", icon: Sparkles },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md 
                      transition-all duration-200 ${
                        activeTab === tab.id
                          ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg"
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
                  {/* Search Overview */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Globe className="w-5 h-5 text-blue-400" />
                      <label className="text-white font-semibold">
                        Search Overview
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-600/30">
                        <div className="flex items-center space-x-2 mb-2">
                          <Search className="w-4 h-4 text-blue-400" />
                          <span className="text-slate-300 text-sm font-medium">
                            Web Search
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 space-y-1">
                          <div>• Real-time web search</div>
                          <div>• AI-powered results</div>
                          <div>• Context-aware ranking</div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-600/30">
                        <div className="flex items-center space-x-2 mb-2">
                          <Zap className="w-4 h-4 text-green-400" />
                          <span className="text-slate-300 text-sm font-medium">
                            Performance
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 space-y-1">
                          <div>• Fast response times</div>
                          <div>• Comprehensive coverage</div>
                          <div>• Reliable results</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Search Capabilities */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Target className="w-5 h-5 text-purple-400" />
                      <label className="text-white font-semibold">
                        Search Capabilities
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {TAVILY_FEATURES.map((feature, index) => (
                        <div
                          key={index}
                          className="p-4 bg-slate-900/50 rounded-lg border border-slate-600/30"
                        >
                          <div className="flex items-center space-x-2 mb-2">
                            <feature.icon
                              className={`w-4 h-4 ${feature.color}`}
                            />
                            <span className="text-slate-300 text-sm font-medium">
                              {feature.name}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">
                            {feature.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Search Information */}
                  <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl p-6 border border-blue-500/20">
                    <div className="flex items-center space-x-2 mb-4">
                      <Search className="w-5 h-5 text-blue-400" />
                      <label className="text-white font-semibold">
                        Search Information
                      </label>
                    </div>
                    <div className="text-xs text-slate-300 space-y-2">
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-400">•</span>
                        <span>
                          Tavily provides AI-powered web search capabilities
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-400">•</span>
                        <span>
                          Access to real-time, up-to-date information from
                          across the web
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-400">•</span>
                        <span>
                          Intelligent search results with context-aware ranking
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-blue-400">•</span>
                        <span>
                          Comprehensive coverage of billions of web pages and
                          documents
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Credentials Tab */}
              {activeTab === "credentials" && (
                <div className="space-y-6">
                  {/* API Configuration */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Key className="w-5 h-5 text-emerald-400" />
                      <label className="text-white font-semibold">
                        API Configuration
                      </label>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          Select Credential (Optional)
                        </label>
                        <select
                          className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                            text-white px-4 py-3 focus:border-emerald-500 focus:ring-2 
                            focus:ring-emerald-500/20 transition-all"
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
                                    "tavily_api_key",
                                    result.secret.api_key
                                  );
                                }
                              } finally {
                                setLoadingCredential(false);
                              }
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
                            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-emerald-400 text-sm">
                              Loading credential...
                            </span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          Tavily API Key
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Field
                            className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                              text-white pl-10 pr-4 py-3 focus:border-emerald-500 focus:ring-2 
                              focus:ring-emerald-500/20 transition-all"
                            type="password"
                            name="tavily_api_key"
                            placeholder="your-tavily-api-key"
                          />
                        </div>
                        <ErrorMessage
                          name="tavily_api_key"
                          component="div"
                          className="text-red-400 text-sm mt-2"
                        />
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-600/30">
                      <div className="flex items-center space-x-2 mb-2">
                        <Shield className="w-4 h-4 text-blue-400" />
                        <span className="text-slate-300 text-sm font-medium">
                          Security Notes
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1">
                        <div>• API keys are encrypted and stored securely</div>
                        <div>• Never share your API key publicly</div>
                        <div>• Rotate keys regularly for enhanced security</div>
                        <div>• Monitor API usage for unusual activity</div>
                      </div>
                    </div>
                  </div>

                  {/* API Information */}
                  <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl p-6 border border-emerald-500/20">
                    <div className="flex items-center space-x-2 mb-4">
                      <Globe className="w-5 h-5 text-emerald-400" />
                      <label className="text-white font-semibold">
                        API Information
                      </label>
                    </div>
                    <div className="text-xs text-slate-300 space-y-2">
                      <div className="flex items-start space-x-2">
                        <span className="text-emerald-400">•</span>
                        <span>
                          Tavily API provides AI-powered web search capabilities
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-emerald-400">•</span>
                        <span>
                          Access to real-time information from across the web
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-emerald-400">•</span>
                        <span>
                          Intelligent search results with context-aware ranking
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-emerald-400">•</span>
                        <span>
                          Comprehensive coverage of billions of web pages
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Features Tab */}
              {activeTab === "features" && (
                <div className="space-y-6">
                  {/* Search Features */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      <label className="text-white font-semibold">
                        Search Features
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {TAVILY_FEATURES.map((feature, index) => (
                        <div
                          key={index}
                          className="p-4 bg-slate-900/50 rounded-lg border border-slate-600/30"
                        >
                          <div className="flex items-center space-x-2 mb-2">
                            <feature.icon
                              className={`w-4 h-4 ${feature.color}`}
                            />
                            <span className="text-slate-300 text-sm font-medium">
                              {feature.name}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">
                            {feature.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Usage Guidelines */}
                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/20">
                    <div className="flex items-center space-x-2 mb-4">
                      <Eye className="w-5 h-5 text-purple-400" />
                      <label className="text-white font-semibold">
                        Usage Guidelines
                      </label>
                    </div>
                    <div className="text-xs text-slate-300 space-y-2">
                      <div className="flex items-start space-x-2">
                        <span className="text-purple-400">•</span>
                        <span>
                          Use for real-time information retrieval and research
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-purple-400">•</span>
                        <span>Ideal for fact-checking and current events</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-purple-400">•</span>
                        <span>
                          Perfect for comprehensive web search capabilities
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-purple-400">•</span>
                        <span>
                          Monitor API usage to optimize costs and performance
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Best Practices */}
                  <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-6 border border-green-500/20">
                    <div className="flex items-center space-x-2 mb-4">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <label className="text-white font-semibold">
                        Best Practices
                      </label>
                    </div>
                    <div className="text-xs text-slate-300 space-y-2">
                      <div className="flex items-start space-x-2">
                        <span className="text-green-400">•</span>
                        <span>
                          Use specific search queries for better results
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-green-400">•</span>
                        <span>Monitor API usage and costs regularly</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-green-400">•</span>
                        <span>Store credentials securely and rotate keys</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-green-400">•</span>
                        <span>
                          Test search functionality before production use
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
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 
                    hover:from-blue-400 hover:to-cyan-500 text-white rounded-lg 
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

export default TavilySearchConfigModal;
