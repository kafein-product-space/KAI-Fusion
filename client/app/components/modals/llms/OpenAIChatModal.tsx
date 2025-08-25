import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import { useSnackbar } from "notistack";
import { useUserCredentialStore } from "~/stores/userCredential";
import { getUserCredentialSecret } from "~/services/userCredentialService";
import type { UserCredential } from "~/types/api";
import {
  Brain,
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
  Cpu,
  DollarSign,
} from "lucide-react";

interface OpenAIChatConfig {
  model_name?: string;
  temperature?: number;
  max_tokens?: number;
  credential_name?: string;
  api_key?: string;
}

interface OpenAIChatNodeModalProps {
  nodeData: any;
  onSave: (data: OpenAIChatConfig) => void;
  nodeId: string;
}

// OpenAI Model Options with enhanced descriptions
const OPENAI_MODELS = [
  {
    value: "gpt-4o",
    label: "GPT-4o ⭐",
    description:
      "Latest GPT-4 optimized model • Best performance • Input: $0.0025/1K, Output: $0.01/1K",
    icon: "🚀",
    color: "from-purple-500 to-pink-500",
  },
  {
    value: "gpt-4o-mini",
    label: "GPT-4o Mini",
    description:
      "Fast and efficient • Cost-effective • Input: $0.00015/1K, Output: $0.0006/1K",
    icon: "⚡",
    color: "from-blue-500 to-cyan-500",
  },
  {
    value: "gpt-4-turbo",
    label: "GPT-4 Turbo",
    description:
      "Powerful with large context • High performance • Input: $0.01/1K, Output: $0.03/1K",
    icon: "🔥",
    color: "from-orange-500 to-red-500",
  },
  {
    value: "gpt-4",
    label: "GPT-4",
    description: "Classic GPT-4 • Reliable • Input: $0.03/1K, Output: $0.06/1K",
    icon: "💎",
    color: "from-emerald-500 to-teal-500",
  },
  {
    value: "gpt-4-32k",
    label: "GPT-4 32K",
    description:
      "Extended context • Large documents • Input: $0.06/1K, Output: $0.12/1K",
    icon: "📚",
    color: "from-indigo-500 to-purple-500",
  },
  {
    value: "o3",
    label: "O3",
    description: "Claude 3.5 Sonnet • Advanced reasoning • Anthropic's latest",
    icon: "🧠",
    color: "from-green-500 to-emerald-500",
  },
  {
    value: "o3-mini",
    label: "O3 Mini",
    description: "Claude 3.5 Haiku • Fast and efficient • Cost-effective",
    icon: "⚡",
    color: "from-yellow-500 to-orange-500",
  },
];

const OpenAIChatNodeModal = forwardRef<
  HTMLDialogElement,
  OpenAIChatNodeModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);
  const { enqueueSnackbar } = useSnackbar();

  const { userCredentials, fetchCredentials, isLoading } =
    useUserCredentialStore();
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>("");
  const [apiKeyOverride, setApiKeyOverride] = useState<string>("");
  const [loadingCredential, setLoadingCredential] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  const formikRef = useRef<any>(null);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  useEffect(() => {
    if (selectedCredentialId) {
      setLoadingCredential(true);
      getUserCredentialSecret(selectedCredentialId)
        .then((cred) => {
          console.log("[LLM Modal] getUserCredentialSecret result:", cred);
          if (cred?.secret?.api_key) {
            setApiKeyOverride(cred.secret.api_key);
            if (formikRef.current) {
              formikRef.current.setFieldValue("api_key", cred.secret.api_key);
            }
          } else {
            setApiKeyOverride("");
            if (formikRef.current) {
              formikRef.current.setFieldValue("api_key", "");
            }
          }

          if (cred?.name && formikRef.current) {
            formikRef.current.setFieldValue("credential_name", cred.name);
          }
        })
        .finally(() => setLoadingCredential(false));
    } else {
      setApiKeyOverride("");
      if (formikRef.current) {
        formikRef.current.setFieldValue("credential_name", "");
        formikRef.current.setFieldValue("api_key", "");
      }
    }
  }, [selectedCredentialId]);

  const selectedCredential = userCredentials.find(
    (cred) => cred.id === selectedCredentialId
  );

  const initialValues: OpenAIChatConfig = {
    model_name: nodeData?.model_name || "gpt-4o",
    temperature: nodeData?.temperature ?? 0.1,
    max_tokens: nodeData?.max_tokens ?? 10000,
    credential_name:
      selectedCredential?.name || nodeData?.credential_name || "",
    api_key: selectedCredentialId ? apiKeyOverride : nodeData?.api_key || "",
  };

  const validate = (values: OpenAIChatConfig) => {
    const errors: Record<string, string> = {};
    if (!values.api_key) errors.api_key = "API Key is required";
    if (!values.credential_name)
      errors.credential_name = "Credential name is required";
    if (!values.model_name) errors.model_name = "Model is required";
    if (
      values.temperature !== undefined &&
      (values.temperature < 0 || values.temperature > 2)
    ) {
      errors.temperature = "Temperature must be between 0 and 2";
    }
    if (
      values.max_tokens !== undefined &&
      (values.max_tokens < 1 || values.max_tokens > 200000)
    ) {
      errors.max_tokens = "Max tokens must be between 1 and 200000";
    }
    return errors;
  };

  const handleSubmit = async (
    values: OpenAIChatConfig,
    { setSubmitting }: any
  ) => {
    try {
      onSave(values);
      dialogRef.current?.close();
      enqueueSnackbar("Configuration saved successfully", {
        variant: "success",
      });
    } catch (error: any) {
      enqueueSnackbar(error?.message || "Failed to save configuration.", {
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
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
            className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl 
            flex items-center justify-center shadow-lg"
          >
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-white">
              OpenAI Chat Configuration
            </h3>
            <p className="text-slate-400 text-sm">
              Configure AI model settings and credentials
            </p>
          </div>
        </div>

        <Formik
          innerRef={formikRef}
          initialValues={initialValues}
          validate={validate}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ isSubmitting, setFieldValue, values }) => (
            <Form className="space-y-6">
              {/* Tab Navigation */}
              <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1">
                {[
                  { id: "basic", label: "Basic", icon: Settings },
                  { id: "credentials", label: "Credentials", icon: Key },
                  { id: "advanced", label: "Advanced", icon: Zap },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md 
                      transition-all duration-200 ${
                        activeTab === tab.id
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
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
                  {/* Model Selection */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Cpu className="w-5 h-5 text-blue-400" />
                      <label className="text-white font-semibold">
                        Model Selection
                      </label>
                    </div>

                    <div>
                      <label className="text-slate-300 text-sm mb-2 block">
                        AI Model
                      </label>
                      <Field
                        as="select"
                        name="model_name"
                        className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                          text-white px-4 py-3 focus:border-blue-500 focus:ring-2 
                          focus:ring-blue-500/20 transition-all"
                      >
                        {OPENAI_MODELS.map((model) => (
                          <option key={model.value} value={model.value}>
                            {model.icon} {model.label}
                          </option>
                        ))}
                      </Field>
                      <div className="mt-2 p-2 bg-slate-900/30 rounded text-xs text-slate-400">
                        {
                          OPENAI_MODELS.find(
                            (m) => m.value === values.model_name
                          )?.description
                        }
                      </div>
                      <ErrorMessage
                        name="model_name"
                        component="div"
                        className="text-red-400 text-sm mt-2"
                      />
                    </div>
                  </div>

                  {/* Model Capabilities */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Activity className="w-5 h-5 text-green-400" />
                      <label className="text-white font-semibold">
                        Model Capabilities
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-600/30">
                        <div className="flex items-center space-x-2 mb-2">
                          <Brain className="w-4 h-4 text-green-400" />
                          <span className="text-slate-300 text-sm font-medium">
                            Reasoning
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 space-y-1">
                          <div>• Complex problem solving</div>
                          <div>• Logical reasoning</div>
                          <div>• Context understanding</div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-600/30">
                        <div className="flex items-center space-x-2 mb-2">
                          <Palette className="w-4 h-4 text-purple-400" />
                          <span className="text-slate-300 text-sm font-medium">
                            Creativity
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 space-y-1">
                          <div>• Creative writing</div>
                          <div>• Code generation</div>
                          <div>• Content creation</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cost Information */}
                  <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-6 border border-yellow-500/20">
                    <div className="flex items-center space-x-2 mb-4">
                      <DollarSign className="w-5 h-5 text-yellow-400" />
                      <label className="text-white font-semibold">
                        Cost Information
                      </label>
                    </div>
                    <div className="text-xs text-slate-300 space-y-2">
                      <div className="flex items-start space-x-2">
                        <span className="text-yellow-400">•</span>
                        <span>Model costs vary by input/output tokens</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-yellow-400">•</span>
                        <span>Monitor usage to optimize costs</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-yellow-400">•</span>
                        <span>
                          Consider model selection based on task requirements
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Credentials Tab */}
              {activeTab === "credentials" && (
                <div className="space-y-6">
                  {/* Credential Selection */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Key className="w-5 h-5 text-emerald-400" />
                      <label className="text-white font-semibold">
                        Credential Management
                      </label>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          Select Credential
                        </label>
                        <select
                          className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                            text-white px-4 py-3 focus:border-emerald-500 focus:ring-2 
                            focus:ring-emerald-500/20 transition-all"
                          value={selectedCredentialId}
                          onChange={async (
                            e: React.ChangeEvent<HTMLSelectElement>
                          ) => {
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
                                    "api_key",
                                    result.secret.api_key
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
                          disabled={
                            isLoading ||
                            userCredentials.length === 0 ||
                            loadingCredential
                          }
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
                          Credential Name
                        </label>
                        <Field
                          type="text"
                          name="credential_name"
                          className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                            text-white px-4 py-3 focus:border-emerald-500 focus:ring-2 
                            focus:ring-emerald-500/20 transition-all"
                          value={values.credential_name}
                          onChange={(
                            e: React.ChangeEvent<HTMLInputElement>
                          ) => {
                            setFieldValue("credential_name", e.target.value);
                          }}
                          readOnly={!!selectedCredentialId}
                          disabled={loadingCredential}
                          placeholder="Enter credential name..."
                        />
                        <ErrorMessage
                          name="credential_name"
                          component="div"
                          className="text-red-400 text-sm mt-2"
                        />
                      </div>
                    </div>
                  </div>

                  {/* API Key Configuration */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Lock className="w-5 h-5 text-blue-400" />
                      <label className="text-white font-semibold">
                        API Key Configuration
                      </label>
                    </div>

                    <div>
                      <label className="text-slate-300 text-sm mb-2 block">
                        API Key
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Field
                          type="password"
                          name="api_key"
                          className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                            text-white pl-10 pr-4 py-3 focus:border-blue-500 focus:ring-2 
                            focus:ring-blue-500/20 transition-all"
                          value={values.api_key}
                          onChange={(
                            e: React.ChangeEvent<HTMLInputElement>
                          ) => {
                            setApiKeyOverride(e.target.value);
                            setFieldValue("api_key", e.target.value);
                          }}
                          disabled={loadingCredential}
                          placeholder="sk-..."
                        />
                      </div>
                      <ErrorMessage
                        name="api_key"
                        component="div"
                        className="text-red-400 text-sm mt-2"
                      />
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
                </div>
              )}

              {/* Advanced Configuration Tab */}
              {activeTab === "advanced" && (
                <div className="space-y-6">
                  {/* Temperature Settings */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Palette className="w-5 h-5 text-orange-400" />
                      <label className="text-white font-semibold">
                        Temperature Settings
                      </label>
                    </div>

                    <div>
                      <label className="text-slate-300 text-sm mb-2 block">
                        Temperature:{" "}
                        <span className="text-orange-400 font-mono">
                          {values.temperature}
                        </span>
                      </label>
                      <Field
                        type="range"
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-orange-500
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                        name="temperature"
                        min="0"
                        max="2"
                        step="0.1"
                      />
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>Deterministic</span>
                        <span>Creative</span>
                      </div>
                      <ErrorMessage
                        name="temperature"
                        component="div"
                        className="text-red-400 text-sm mt-2"
                      />
                    </div>
                  </div>

                  {/* Token Settings */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Clock className="w-5 h-5 text-cyan-400" />
                      <label className="text-white font-semibold">
                        Token Configuration
                      </label>
                    </div>

                    <div>
                      <label className="text-slate-300 text-sm mb-2 block">
                        Max Tokens:{" "}
                        <span className="text-cyan-400 font-mono">
                          {values.max_tokens}
                        </span>
                      </label>
                      <Field
                        type="range"
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-cyan-500
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                        name="max_tokens"
                        min="1"
                        max="200000"
                        step="1000"
                      />
                      <div className="text-xs text-slate-400 mt-1">
                        Maximum tokens for response generation (1-200,000)
                      </div>
                      <ErrorMessage
                        name="max_tokens"
                        component="div"
                        className="text-red-400 text-sm mt-2"
                      />
                    </div>
                  </div>

                  {/* Performance Guidelines */}
                  <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-6 border border-green-500/20">
                    <div className="flex items-center space-x-2 mb-4">
                      <Zap className="w-5 h-5 text-green-400" />
                      <label className="text-white font-semibold">
                        Performance Guidelines
                      </label>
                    </div>
                    <div className="text-xs text-slate-300 space-y-2">
                      <div className="flex items-start space-x-2">
                        <span className="text-green-400">•</span>
                        <span>
                          Lower temperature (0-0.5) for factual responses
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-green-400">•</span>
                        <span>
                          Higher temperature (0.7-1.0) for creative tasks
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-green-400">•</span>
                        <span>
                          Adjust max tokens based on expected response length
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-green-400">•</span>
                        <span>Monitor token usage to optimize costs</span>
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
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 
                    hover:from-blue-400 hover:to-purple-500 text-white rounded-lg 
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

export default OpenAIChatNodeModal;
