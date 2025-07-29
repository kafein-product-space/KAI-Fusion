import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  MessageCircle,
  Settings,
  Brain,
  History,
  Users,
  Zap,
  Clock,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  Key,
  Lock,
  Database,
  Eye,
  Play,
  BarChart3,
  Sparkles,
} from "lucide-react";

interface ConversationMemoryConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface ConversationMemoryConfig {
  k: number;
  memory_key: string;
  return_messages: boolean;
  input_key: string;
  output_key: string;
  enable_cleanup: boolean;
  cleanup_threshold: number;
  enable_compression: boolean;
  compression_ratio: number;
  enable_encryption: boolean;
  encryption_key: string;
  enable_backup: boolean;
  backup_interval: number;
}

// Memory Type Options
const MEMORY_TYPES = [
  {
    value: "conversation",
    label: "Conversation Memory ⭐",
    description:
      "Maintains conversation history with context awareness • Best for chatbots and interactive systems",
    icon: "💬",
    color: "from-green-500 to-emerald-500",
  },
  {
    value: "buffer",
    label: "Buffer Memory",
    description:
      "Simple sliding window memory • Fast and lightweight for basic use cases",
    icon: "📦",
    color: "from-blue-500 to-cyan-500",
  },
  {
    value: "summary",
    label: "Summary Memory",
    description:
      "Compressed memory with automatic summarization • Efficient for long conversations",
    icon: "📝",
    color: "from-purple-500 to-pink-500",
  },
];

// Cleanup Strategy Options
const CLEANUP_STRATEGIES = [
  {
    value: "fifo",
    label: "First In, First Out",
    description: "Remove oldest messages when limit is reached",
    icon: "⏰",
  },
  {
    value: "lru",
    label: "Least Recently Used",
    description: "Remove least recently accessed messages",
    icon: "🔄",
  },
  {
    value: "importance",
    label: "Importance Based",
    description: "Remove messages based on importance score",
    icon: "⭐",
  },
];

const ConversationMemoryConfigModal = forwardRef<
  HTMLDialogElement,
  ConversationMemoryConfigModalProps
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const initialValues: ConversationMemoryConfig = {
    k: nodeData?.k ?? 5,
    memory_key: nodeData?.memory_key || "chat_history",
    return_messages: nodeData?.return_messages ?? true,
    input_key: nodeData?.input_key || "input",
    output_key: nodeData?.output_key || "output",
    enable_cleanup: nodeData?.enable_cleanup ?? false,
    cleanup_threshold: nodeData?.cleanup_threshold ?? 10,
    enable_compression: nodeData?.enable_compression ?? false,
    compression_ratio: nodeData?.compression_ratio ?? 0.7,
    enable_encryption: nodeData?.enable_encryption ?? false,
    encryption_key: nodeData?.encryption_key || "",
    enable_backup: nodeData?.enable_backup ?? false,
    backup_interval: nodeData?.backup_interval ?? 24,
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-bottom sm:modal-middle backdrop-blur-sm"
    >
      <div
        className="modal-box max-w-4xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
        border border-slate-700/50 shadow-2xl shadow-green-500/10 backdrop-blur-xl"
      >
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-700/50">
          <div
            className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl 
            flex items-center justify-center shadow-lg"
          >
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-white">
              Conversation Memory Configuration
            </h3>
            <p className="text-slate-400 text-sm">
              Configure conversation history and memory management settings
            </p>
          </div>
        </div>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validate={(values) => {
            const errors: Record<string, string> = {};
            if (!values.memory_key) {
              errors.memory_key = "Memory key is required.";
            }
            if (values.k < 1 || values.k > 50) {
              errors.k = "Window size must be between 1 and 50.";
            }
            if (values.enable_encryption && !values.encryption_key) {
              errors.encryption_key =
                "Encryption key is required when encryption is enabled.";
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
              {/* Basic Settings */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-4">
                  <Settings className="w-5 h-5 text-green-400" />
                  <label className="text-white font-semibold">
                    Basic Settings
                  </label>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Window Size (k) */}
                  <div>
                    <label className="text-slate-300 text-sm mb-2 block">
                      Window Size (k):{" "}
                      <span className="text-green-400 font-mono">
                        {values.k}
                      </span>
                    </label>
                    <div className="relative">
                      <Field
                        type="range"
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-green-500
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                        name="k"
                        min="1"
                        max="50"
                        step="1"
                      />
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>1</span>
                        <span>25</span>
                        <span>50</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 mt-2">
                      Number of messages to remember in conversation history
                    </div>
                    <ErrorMessage
                      name="k"
                      component="div"
                      className="text-red-400 text-sm mt-1"
                    />
                  </div>

                  {/* Memory Key */}
                  <div>
                    <label className="text-slate-300 text-sm mb-2 block">
                      Memory Key
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Field
                        className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                          text-white pl-10 pr-4 py-3 focus:border-green-500 focus:ring-2 
                          focus:ring-green-500/20 transition-all"
                        name="memory_key"
                        placeholder="chat_history"
                      />
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Unique identifier for this memory instance
                    </div>
                    <ErrorMessage
                      name="memory_key"
                      component="div"
                      className="text-red-400 text-sm mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                  {/* Input Key */}
                  <div>
                    <label className="text-slate-300 text-sm mb-2 block">
                      Input Key
                    </label>
                    <div className="relative">
                      <MessageCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Field
                        className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                          text-white pl-10 pr-4 py-3 focus:border-green-500 focus:ring-2 
                          focus:ring-green-500/20 transition-all"
                        name="input_key"
                        placeholder="input"
                      />
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Key for incoming messages
                    </div>
                  </div>

                  {/* Output Key */}
                  <div>
                    <label className="text-slate-300 text-sm mb-2 block">
                      Output Key
                    </label>
                    <div className="relative">
                      <MessageCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Field
                        className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                          text-white pl-10 pr-4 py-3 focus:border-green-500 focus:ring-2 
                          focus:ring-green-500/20 transition-all"
                        name="output_key"
                        placeholder="output"
                      />
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      Key for outgoing messages
                    </div>
                  </div>
                </div>
              </div>

              {/* Memory Features */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-4">
                  <Brain className="w-5 h-5 text-purple-400" />
                  <label className="text-white font-semibold">
                    Memory Features
                  </label>
                </div>

                <div className="space-y-3">
                  <ToggleField
                    name="return_messages"
                    icon={<MessageCircle className="w-4 h-4" />}
                    label="Return Messages"
                    description="Return full message objects instead of just text"
                  />
                  <ToggleField
                    name="enable_cleanup"
                    icon={<Zap className="w-4 h-4" />}
                    label="Auto Cleanup"
                    description="Automatically clean up old messages when limit is reached"
                  />
                  <ToggleField
                    name="enable_compression"
                    icon={<Database className="w-4 h-4" />}
                    label="Memory Compression"
                    description="Compress memory to save space and improve performance"
                  />
                  <ToggleField
                    name="enable_encryption"
                    icon={<Lock className="w-4 h-4" />}
                    label="Memory Encryption"
                    description="Encrypt stored messages for enhanced security"
                  />
                  <ToggleField
                    name="enable_backup"
                    icon={<History className="w-4 h-4" />}
                    label="Auto Backup"
                    description="Automatically backup memory data at regular intervals"
                  />
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="flex flex-col gap-6">
                {/* Cleanup Settings */}
                {values.enable_cleanup && (
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      <label className="text-white font-semibold">
                        Cleanup Settings
                      </label>
                    </div>

                    <div>
                      <label className="text-slate-300 text-sm mb-2 block">
                        Cleanup Threshold:{" "}
                        <span className="text-yellow-400 font-mono">
                          {values.cleanup_threshold}
                        </span>
                      </label>
                      <Field
                        type="range"
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-yellow-500
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                        name="cleanup_threshold"
                        min="5"
                        max="100"
                        step="5"
                      />
                      <div className="text-xs text-slate-400 mt-1">
                        Number of messages before cleanup is triggered
                      </div>
                    </div>
                  </div>
                )}

                {/* Compression Settings */}
                {values.enable_compression && (
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Database className="w-5 h-5 text-blue-400" />
                      <label className="text-white font-semibold">
                        Compression Settings
                      </label>
                    </div>

                    <div>
                      <label className="text-slate-300 text-sm mb-2 block">
                        Compression Ratio:{" "}
                        <span className="text-blue-400 font-mono">
                          {values.compression_ratio}
                        </span>
                      </label>
                      <Field
                        type="range"
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                        name="compression_ratio"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                      />
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>High Compression</span>
                        <span>Low Compression</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Encryption Settings */}
                {values.enable_encryption && (
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Lock className="w-5 h-5 text-red-400" />
                      <label className="text-white font-semibold">
                        Encryption Settings
                      </label>
                    </div>

                    <div>
                      <label className="text-slate-300 text-sm mb-2 block">
                        Encryption Key
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Field
                          className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                            text-white pl-10 pr-4 py-3 focus:border-red-500 focus:ring-2 
                            focus:ring-red-500/20 transition-all"
                          type="password"
                          name="encryption_key"
                          placeholder="Enter encryption key..."
                        />
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Key used to encrypt/decrypt memory data
                      </div>
                      <ErrorMessage
                        name="encryption_key"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                    </div>
                  </div>
                )}

                {/* Backup Settings */}
                {values.enable_backup && (
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <History className="w-5 h-5 text-cyan-400" />
                      <label className="text-white font-semibold">
                        Backup Settings
                      </label>
                    </div>

                    <div>
                      <label className="text-slate-300 text-sm mb-2 block">
                        Backup Interval (hours):{" "}
                        <span className="text-cyan-400 font-mono">
                          {values.backup_interval}
                        </span>
                      </label>
                      <Field
                        type="range"
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-cyan-500
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                        name="backup_interval"
                        min="1"
                        max="168"
                        step="1"
                      />
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>1 hour</span>
                        <span>1 week</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Information Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Memory Information */}
                <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-600/20">
                  <div className="flex items-center space-x-2 mb-3">
                    <Brain className="w-5 h-5 text-green-400" />
                    <h5 className="text-white font-semibold">
                      Memory Information
                    </h5>
                  </div>
                  <div className="space-y-2 text-sm text-slate-300">
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span className="text-green-400">Conversation</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Capacity:</span>
                      <span className="text-blue-400">{values.k} messages</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="text-green-400">Active</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Features:</span>
                      <span className="text-purple-400">
                        {[
                          values.return_messages && "Messages",
                          values.enable_cleanup && "Cleanup",
                          values.enable_compression && "Compression",
                          values.enable_encryption && "Encryption",
                          values.enable_backup && "Backup",
                        ]
                          .filter(Boolean)
                          .join(", ") || "Basic"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Performance Guidelines */}
                <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-600/20">
                  <div className="flex items-center space-x-2 mb-3">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    <h5 className="text-white font-semibold">
                      Performance Guidelines
                    </h5>
                  </div>
                  <div className="space-y-2 text-sm text-slate-300">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Optimal for real-time conversations</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Efficient memory management</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span>Automatic cleanup of old messages</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Usage Guidelines */}
              <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center space-x-2 mb-3">
                  <Info className="w-5 h-5 text-blue-400" />
                  <h5 className="text-white font-semibold">Usage Guidelines</h5>
                </div>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>
                      Use for maintaining conversation context across multiple
                      interactions
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>
                      Ideal for chatbots, customer support, and interactive AI
                      systems
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>
                      Automatically manages memory overflow and maintains
                      performance
                    </span>
                  </div>
                </div>
              </div>

              {/* Best Practices */}
              <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center space-x-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <h5 className="text-white font-semibold">Best Practices</h5>
                </div>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>
                      Set k value based on conversation complexity and memory
                      requirements
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>
                      Use descriptive memory keys for better organization
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Monitor memory usage to optimize performance</span>
                  </div>
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
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 
                    hover:from-green-400 hover:to-emerald-500 text-white rounded-lg 
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
            peer-checked:bg-gradient-to-r peer-checked:from-green-500 peer-checked:to-emerald-600"
          ></div>
        </label>
      </div>
    )}
  </Field>
);

ConversationMemoryConfigModal.displayName = "ConversationMemoryConfigModal";

export default ConversationMemoryConfigModal;
