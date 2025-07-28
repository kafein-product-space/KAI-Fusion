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
  MessageSquare,
  Settings,
  Zap,
  Clock,
  Database,
  Eye,
  Play,
  BarChart3,
  Sparkles,
  Lock,
} from "lucide-react";

interface RetrievalQAConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface RetrievalQAConfig {
  question: string;
  llm_model: string;
  openai_api_key: string;
  prompt_template: string;
  custom_prompt: string;
  temperature: number;
  max_tokens: number;
  enable_memory: boolean;
  memory_window: number;
  include_sources: boolean;
  enable_streaming: boolean;
  enable_evaluation: boolean;
}

// LLM Model Options
const LLM_MODELS = [
  {
    value: "gpt-4o",
    label: "GPT-4o ⭐",
    description:
      "Latest GPT-4 optimized model, best for complex reasoning • Input: $0.0025/1K, Output: $0.01/1K",
    icon: "🚀",
    color: "from-purple-500 to-pink-500",
  },
  {
    value: "gpt-4-turbo",
    label: "GPT-4 Turbo",
    description:
      "Powerful GPT-4 with large context window • Input: $0.01/1K, Output: $0.03/1K",
    icon: "⚡",
    color: "from-blue-500 to-cyan-500",
  },
  {
    value: "gpt-3.5-turbo",
    label: "GPT-3.5 Turbo ⭐",
    description:
      "Fast and cost-effective for most RAG applications • Input: $0.0005/1K, Output: $0.0015/1K",
    icon: "💨",
    color: "from-green-500 to-emerald-500",
  },
];

// Prompt Template Options
const PROMPT_TEMPLATES = [
  {
    value: "default",
    label: "Default RAG",
    description: "Standard RAG prompt with context and question",
    icon: "📝",
  },
  {
    value: "detailed",
    label: "Detailed Analysis",
    description: "Comprehensive analysis with structured response",
    icon: "🔍",
  },
  {
    value: "concise",
    label: "Concise & Direct",
    description: "Short, direct answers for quick responses",
    icon: "⚡",
  },
  {
    value: "academic",
    label: "Academic Style",
    description: "Scholarly responses with academic rigor",
    icon: "🎓",
  },
  {
    value: "conversational",
    label: "Conversational",
    description: "Friendly, conversational tone for user engagement",
    icon: "💬",
  },
];

const RetrievalQAConfigModal = forwardRef<
  HTMLDialogElement,
  RetrievalQAConfigModalProps
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

  const initialValues: RetrievalQAConfig = {
    question: nodeData?.question || "",
    llm_model: nodeData?.llm_model || "gpt-4o",
    openai_api_key: nodeData?.openai_api_key || "",
    prompt_template: nodeData?.prompt_template || "default",
    custom_prompt: nodeData?.custom_prompt || "",
    temperature: nodeData?.temperature || 0.1,
    max_tokens: nodeData?.max_tokens || 1000,
    enable_memory: nodeData?.enable_memory || false,
    memory_window: nodeData?.memory_window || 5,
    include_sources: nodeData?.include_sources !== false,
    enable_streaming: nodeData?.enable_streaming || false,
    enable_evaluation: nodeData?.enable_evaluation !== false,
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-bottom sm:modal-middle backdrop-blur-sm"
    >
      <div
        className="modal-box max-w-4xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
        border border-slate-700/50 shadow-2xl shadow-purple-500/10 backdrop-blur-xl"
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
              RAG Question Answering
            </h3>
            <p className="text-slate-400 text-sm">
              Configure your retrieval-augmented generation settings
            </p>
          </div>
        </div>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validate={(values) => {
            const errors: Record<string, string> = {};
            if (!values.question) {
              errors.question = "Question is required.";
            }
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
              {/* Question Input */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-3">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                  <label className="text-white font-semibold">Question</label>
                </div>
                <Field
                  as="textarea"
                  className="w-full h-24 bg-slate-900/80 border border-slate-600/50 rounded-lg 
                    text-white placeholder-slate-400 px-4 py-3 focus:border-blue-500 focus:ring-2 
                    focus:ring-blue-500/20 transition-all resize-none"
                  name="question"
                  placeholder="Enter the question you want to get answered..."
                />
                <ErrorMessage
                  name="question"
                  component="div"
                  className="text-red-400 text-sm mt-2"
                />
              </div>

              <div className="flex flex-col gap-6">
                {/* Credentials Section */}
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                  <div className="flex items-center space-x-2 mb-4">
                    <Key className="w-5 h-5 text-emerald-400" />
                    <label className="text-white font-semibold">
                      API Credentials
                    </label>
                  </div>

                  {/* Credential Selector */}
                  <div className="mb-4">
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
                      <div className="flex items-center space-x-2 mt-2">
                        <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-emerald-400 text-sm">
                          Loading credential...
                        </span>
                      </div>
                    )}
                  </div>

                  {/* API Key Input */}
                  <div>
                    <label className="text-slate-300 text-sm mb-2 block">
                      OpenAI API Key
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Field
                        className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                          text-white pl-10 pr-4 py-3 focus:border-emerald-500 focus:ring-2 
                          focus:ring-emerald-500/20 transition-all"
                        type="password"
                        name="openai_api_key"
                        placeholder="sk-..."
                        value={values.openai_api_key}
                      />
                    </div>
                    <ErrorMessage
                      name="openai_api_key"
                      component="div"
                      className="text-red-400 text-sm mt-2"
                    />
                  </div>
                </div>

                {/* Model Selection */}
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                  <div className="flex items-center space-x-2 mb-4">
                    <Brain className="w-5 h-5 text-purple-400" />
                    <label className="text-white font-semibold">AI Model</label>
                  </div>

                  <Field
                    as="select"
                    className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                      text-white px-4 py-3 focus:border-purple-500 focus:ring-2 
                      focus:ring-purple-500/20 transition-all"
                    name="llm_model"
                  >
                    {LLM_MODELS.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.icon} {model.label}
                      </option>
                    ))}
                  </Field>

                  <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-600/30">
                    <div className="text-xs text-slate-300">
                      {
                        LLM_MODELS.find((m) => m.value === values.llm_model)
                          ?.description
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Prompt Configuration */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-4">
                  <Settings className="w-5 h-5 text-orange-400" />
                  <label className="text-white font-semibold">
                    Prompt Configuration
                  </label>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Template Selection */}
                  <div>
                    <label className="text-slate-300 text-sm mb-2 block">
                      Template
                    </label>
                    <Field
                      as="select"
                      className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                        text-white px-4 py-3 focus:border-orange-500 focus:ring-2 
                        focus:ring-orange-500/20 transition-all"
                      name="prompt_template"
                    >
                      {PROMPT_TEMPLATES.map((template) => (
                        <option key={template.value} value={template.value}>
                          {template.icon} {template.label}
                        </option>
                      ))}
                    </Field>
                    <div className="mt-2 p-2 bg-slate-900/30 rounded text-xs text-slate-400">
                      {
                        PROMPT_TEMPLATES.find(
                          (t) => t.value === values.prompt_template
                        )?.description
                      }
                    </div>
                  </div>

                  {/* Temperature Control */}
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
                      max="1"
                      step="0.1"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>Deterministic</span>
                      <span>Creative</span>
                    </div>
                  </div>
                </div>

                {/* Custom Prompt */}
                <div className="mt-4">
                  <label className="text-slate-300 text-sm mb-2 block">
                    Custom Prompt (Optional)
                  </label>
                  <Field
                    as="textarea"
                    className="w-full h-20 bg-slate-900/80 border border-slate-600/50 rounded-lg 
                      text-white placeholder-slate-400 px-4 py-3 focus:border-orange-500 focus:ring-2 
                      focus:ring-orange-500/20 transition-all resize-none"
                    name="custom_prompt"
                    placeholder="Enter custom prompt template. Use {context} and {question} placeholders."
                  />
                  <div className="text-xs text-slate-400 mt-1">
                    Leave empty to use the selected template.
                  </div>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="flex flex-col gap-6">
                {/* Response Settings */}
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                  <div className="flex items-center space-x-2 mb-4">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    <label className="text-white font-semibold">
                      Response Settings
                    </label>
                  </div>

                  {/* Max Tokens */}
                  <div className="mb-4">
                    <label className="text-slate-300 text-sm mb-2 block">
                      Max Tokens:{" "}
                      <span className="text-yellow-400 font-mono">
                        {values.max_tokens}
                      </span>
                    </label>
                    <Field
                      type="range"
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                        [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-yellow-500
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                      name="max_tokens"
                      min="100"
                      max="4000"
                      step="100"
                    />
                  </div>

                  {/* Feature Toggles */}
                  <div className="space-y-3">
                    <ToggleField
                      name="include_sources"
                      icon={<Database className="w-4 h-4" />}
                      label="Include Sources"
                      description="Include source documents in response"
                    />
                    <ToggleField
                      name="enable_streaming"
                      icon={<Play className="w-4 h-4" />}
                      label="Streaming"
                      description="Stream response token by token"
                    />
                    <ToggleField
                      name="enable_evaluation"
                      icon={<BarChart3 className="w-4 h-4" />}
                      label="Quality Evaluation"
                      description="Evaluate response quality and provide metrics"
                    />
                  </div>
                </div>

                {/* Memory Settings */}
                <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                  <div className="flex items-center space-x-2 mb-4">
                    <Clock className="w-5 h-5 text-cyan-400" />
                    <label className="text-white font-semibold">
                      Memory Settings
                    </label>
                  </div>

                  <ToggleField
                    name="enable_memory"
                    icon={<Sparkles className="w-4 h-4" />}
                    label="Conversation Memory"
                    description="Remember conversation history for follow-up questions"
                  />

                  {values.enable_memory && (
                    <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-600/30">
                      <label className="text-slate-300 text-sm mb-2 block">
                        Memory Window:{" "}
                        <span className="text-cyan-400 font-mono">
                          {values.memory_window}
                        </span>
                      </label>
                      <Field
                        type="range"
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-cyan-500
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                        name="memory_window"
                        min="1"
                        max="20"
                        step="1"
                      />
                      <div className="text-xs text-slate-400 mt-1">
                        Number of previous conversations to remember
                      </div>
                    </div>
                  )}
                </div>
              </div>

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

// Toggle Field Component
const ToggleField = ({
  name,
  icon,
  label,
  description,
}: {
  name: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
}) => (
  <Field name={name}>
    {({ field }: any) => (
      <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-600/20">
        <div className="flex items-center space-x-3">
          <div className="text-slate-400">{icon}</div>
          <div>
            <div className="text-white text-sm font-medium">{label}</div>
            {description && (
              <div className="text-slate-400 text-xs">{description}</div>
            )}
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            {...field}
            type="checkbox"
            checked={field.value}
            className="sr-only peer"
          />
          <div
            className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer 
            peer-checked:after:translate-x-full peer-checked:after:border-white 
            after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
            after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all 
            peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-purple-600"
          ></div>
        </label>
      </div>
    )}
  </Field>
);

export default RetrievalQAConfigModal;
