import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import {
  Database,
  Settings,
  MessageSquare,
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
  ArrowLeftRight,
  FileText,
  Code,
} from "lucide-react";

interface BufferMemoryConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

// Memory Configuration Examples
const MEMORY_EXAMPLES = [
  {
    name: "Conversation History",
    memoryKey: "chat_history",
    inputKey: "user_input",
    outputKey: "ai_response",
    description: "Store conversation context for chat applications",
    icon: MessageSquare,
    color: "from-blue-500 to-cyan-500",
  },
  {
    name: "Session Data",
    memoryKey: "session_data",
    inputKey: "session_input",
    outputKey: "session_output",
    description: "Maintain session-specific information",
    icon: Database,
    color: "from-purple-500 to-pink-500",
  },
  {
    name: "Workflow State",
    memoryKey: "workflow_state",
    inputKey: "workflow_input",
    outputKey: "workflow_output",
    description: "Track workflow progress and state",
    icon: Activity,
    color: "from-green-500 to-emerald-500",
  },
  {
    name: "Document Context",
    memoryKey: "document_context",
    inputKey: "document_input",
    outputKey: "document_output",
    description: "Store document processing context",
    icon: FileText,
    color: "from-orange-500 to-red-500",
  },
];

const BufferMemoryConfigModal = forwardRef<
  HTMLDialogElement,
  BufferMemoryConfigModalProps
>(({ nodeData, onSave }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);

  const [memoryKey, setMemoryKey] = useState(nodeData?.memory_key || "memory");
  const [returnMessages, setReturnMessages] = useState(
    nodeData?.return_messages ?? true
  );
  const [inputKey, setInputKey] = useState(nodeData?.input_key || "input");
  const [outputKey, setOutputKey] = useState(nodeData?.output_key || "output");
  const [activeTab, setActiveTab] = useState("basic");

  const handleSave = () => {
    onSave({
      memory_key: memoryKey,
      return_messages: returnMessages,
      input_key: inputKey,
      output_key: outputKey,
    });
    dialogRef.current?.close();
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
            className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl 
            flex items-center justify-center shadow-lg"
          >
            <Database className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-white">
              Buffer Memory Configuration
            </h3>
            <p className="text-slate-400 text-sm">
              Configure memory storage and retrieval settings
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1">
            {[
              { id: "basic", label: "Basic", icon: Settings },
              { id: "advanced", label: "Advanced", icon: Zap },
              { id: "examples", label: "Examples", icon: Code },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md 
                  transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg"
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
              {/* Memory Key Configuration */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-4">
                  <Key className="w-5 h-5 text-emerald-400" />
                  <label className="text-white font-semibold">
                    Memory Key Configuration
                  </label>
                </div>

                <div>
                  <label className="text-slate-300 text-sm mb-2 block">
                    Memory Key
                  </label>
                  <div className="relative">
                    <Database className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                        text-white pl-10 pr-4 py-3 focus:border-emerald-500 focus:ring-2 
                        focus:ring-emerald-500/20 transition-all"
                      value={memoryKey}
                      onChange={(e) => setMemoryKey(e.target.value)}
                      placeholder="Enter memory key..."
                    />
                  </div>
                  <div className="mt-2 p-2 bg-slate-900/30 rounded text-xs text-slate-400">
                    Unique identifier for storing and retrieving memory data
                  </div>
                </div>
              </div>

              {/* Message Format Configuration */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                  <label className="text-white font-semibold">
                    Message Format Settings
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-600/20">
                  <div className="flex items-center space-x-3">
                    <div className="text-slate-400">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-white text-sm font-medium">
                        Return as Messages
                      </div>
                      <div className="text-slate-400 text-xs">
                        Format memory data as structured messages
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={returnMessages}
                        onChange={(e) => setReturnMessages(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div
                        className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer 
                        peer-checked:after:translate-x-full peer-checked:after:border-white 
                        after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                        after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all 
                        peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-teal-600"
                      ></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Memory Information */}
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl p-6 border border-emerald-500/20">
                <div className="flex items-center space-x-2 mb-4">
                  <Database className="w-5 h-5 text-emerald-400" />
                  <label className="text-white font-semibold">
                    Memory Information
                  </label>
                </div>
                <div className="text-xs text-slate-300 space-y-2">
                  <div className="flex items-start space-x-2">
                    <span className="text-emerald-400">•</span>
                    <span>
                      Buffer memory stores conversation history and context
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-emerald-400">•</span>
                    <span>Memory persists across workflow executions</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-emerald-400">•</span>
                    <span>
                      Useful for maintaining conversation state and context
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-emerald-400">•</span>
                    <span>
                      Memory can be shared between different nodes in workflow
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Advanced Configuration Tab */}
          {activeTab === "advanced" && (
            <div className="space-y-6">
              {/* Input/Output Key Configuration */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-4">
                  <ArrowLeftRight className="w-5 h-5 text-purple-400" />
                  <label className="text-white font-semibold">
                    Input/Output Key Configuration
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-300 text-sm mb-2 block">
                      Input Key
                    </label>
                    <div className="relative">
                      <ArrowLeftRight className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                          text-white pl-10 pr-4 py-3 focus:border-purple-500 focus:ring-2 
                          focus:ring-purple-500/20 transition-all"
                        value={inputKey}
                        onChange={(e) => setInputKey(e.target.value)}
                        placeholder="Enter input key..."
                      />
                    </div>
                    <div className="mt-2 p-2 bg-slate-900/30 rounded text-xs text-slate-400">
                      Key for storing input data in memory
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-300 text-sm mb-2 block">
                      Output Key
                    </label>
                    <div className="relative">
                      <ArrowLeftRight className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                          text-white pl-10 pr-4 py-3 focus:border-purple-500 focus:ring-2 
                          focus:ring-purple-500/20 transition-all"
                        value={outputKey}
                        onChange={(e) => setOutputKey(e.target.value)}
                        placeholder="Enter output key..."
                      />
                    </div>
                    <div className="mt-2 p-2 bg-slate-900/30 rounded text-xs text-slate-400">
                      Key for storing output data in memory
                    </div>
                  </div>
                </div>
              </div>

              {/* Memory Performance */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  <label className="text-white font-semibold">
                    Memory Performance
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-600/30">
                    <div className="flex items-center space-x-2 mb-2">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <span className="text-slate-300 text-sm font-medium">
                        Storage
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <div>• In-memory storage</div>
                      <div>• Fast read/write access</div>
                      <div>• Temporary persistence</div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-600/30">
                    <div className="flex items-center space-x-2 mb-2">
                      <Activity className="w-4 h-4 text-green-400" />
                      <span className="text-slate-300 text-sm font-medium">
                        Retrieval
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <div>• Instant access</div>
                      <div>• Context preservation</div>
                      <div>• State management</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Best Practices */}
              <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl p-6 border border-blue-500/20">
                <div className="flex items-center space-x-2 mb-4">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <label className="text-white font-semibold">
                    Best Practices
                  </label>
                </div>
                <div className="text-xs text-slate-300 space-y-2">
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-400">•</span>
                    <span>
                      Use descriptive memory keys for better organization
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-400">•</span>
                    <span>
                      Enable message formatting for structured conversations
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-400">•</span>
                    <span>
                      Keep input/output keys consistent across workflow
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-400">•</span>
                    <span>Monitor memory usage for large conversations</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Examples Tab */}
          {activeTab === "examples" && (
            <div className="space-y-6">
              {/* Memory Examples */}
              <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-4">
                  <Code className="w-5 h-5 text-orange-400" />
                  <label className="text-white font-semibold">
                    Memory Configuration Examples
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {MEMORY_EXAMPLES.map((example, index) => (
                    <div
                      key={index}
                      className="p-4 bg-slate-900/50 rounded-lg border border-slate-600/30 
                        hover:border-slate-500/50 transition-all cursor-pointer"
                      onClick={() => {
                        setMemoryKey(example.memoryKey);
                        setInputKey(example.inputKey);
                        setOutputKey(example.outputKey);
                      }}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <example.icon className="w-4 h-4 text-orange-400" />
                        <span className="text-slate-300 text-sm font-medium">
                          {example.name}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mb-2">
                        {example.description}
                      </div>
                      <div className="text-xs text-slate-500 space-y-1">
                        <div>
                          Memory:{" "}
                          <span className="text-emerald-400 font-mono">
                            {example.memoryKey}
                          </span>
                        </div>
                        <div>
                          Input:{" "}
                          <span className="text-blue-400 font-mono">
                            {example.inputKey}
                          </span>
                        </div>
                        <div>
                          Output:{" "}
                          <span className="text-purple-400 font-mono">
                            {example.outputKey}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Usage Guidelines */}
              <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl p-6 border border-orange-500/20">
                <div className="flex items-center space-x-2 mb-4">
                  <Eye className="w-5 h-5 text-orange-400" />
                  <label className="text-white font-semibold">
                    Usage Guidelines
                  </label>
                </div>
                <div className="text-xs text-slate-300 space-y-2">
                  <div className="flex items-start space-x-2">
                    <span className="text-orange-400">•</span>
                    <span>Click on examples to apply their configuration</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-orange-400">•</span>
                    <span>Customize keys based on your specific use case</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-orange-400">•</span>
                    <span>
                      Memory keys should be unique within your workflow
                    </span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-orange-400">•</span>
                    <span>
                      Use consistent naming conventions for better organization
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
            >
              <span>Cancel</span>
            </button>
            <button
              type="button"
              className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 
                hover:from-emerald-400 hover:to-teal-500 text-white rounded-lg 
                shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105
                flex items-center space-x-2"
              onClick={handleSave}
            >
              <CheckCircle className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
});

export default BufferMemoryConfigModal;
