import CodeMirror from "@uiw/react-codemirror";
import { tags as t } from "@lezer/highlight";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";
import { useThemeStore } from "~/stores/theme";
import {
  Bot,
  Settings,
  Code,
  Zap,
  Brain,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Play,
  Eye,
  Shield,
  Sparkles,
  Activity,
  Palette,
  Key,
} from "lucide-react";

interface ReactAgentConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
}

// Agent Type Options with enhanced descriptions
const AGENT_TYPES = [
  {
    value: "react",
    label: "ReAct Agent ⭐",
    description:
      "Reasoning and Acting • Tool-using capabilities • Chain-of-thought reasoning",
    icon: "🧠",
    color: "from-blue-500 to-purple-500",
  },
  {
    value: "conversational",
    label: "Conversational Agent",
    description:
      "Natural dialogue • Context-aware responses • Memory retention",
    icon: "💬",
    color: "from-green-500 to-emerald-500",
  },
  {
    value: "task_oriented",
    label: "Task-Oriented Agent",
    description: "Goal-focused • Step-by-step execution • Result-driven",
    icon: "🎯",
    color: "from-orange-500 to-red-500",
  },
];

// Prompt Template Examples
const PROMPT_EXAMPLES = [
  {
    name: "Basic Assistant",
    template: "You are a helpful assistant. Use tools to answer: {input}",
    description: "Simple and direct • General purpose • Tool-enabled",
    icon: "🤖",
  },
  {
    name: "Expert Consultant",
    template:
      "You are an expert consultant with deep knowledge. Analyze the question: {input} and provide detailed insights using available tools.",
    description:
      "Professional tone • Detailed analysis • Expert-level responses",
    icon: "👨‍💼",
  },
  {
    name: "Problem Solver",
    template:
      "You are a problem-solving agent. Break down the problem: {input} into steps and solve it systematically using tools.",
    description:
      "Methodical approach • Step-by-step reasoning • Systematic problem solving",
    icon: "🔧",
  },
  {
    name: "Creative Assistant",
    template:
      "You are a creative assistant. Think outside the box for: {input} and use tools to enhance your creative solutions.",
    description:
      "Innovative thinking • Creative solutions • Outside-the-box approach",
    icon: "🎨",
  },
];

// 🎨 {} içindeki değerleri renklendir
const curlyHighlight = HighlightStyle.define([
  {
    tag: t.special(t.variableName),
    color: "#f59e0b", // amber-500
    fontWeight: "bold",
  },
  {
    tag: t.keyword,
    color: "#3b82f6", // blue-500
  },
]);

const customTheme = EditorView.theme({
  "&": {
    border: "1px solid #475569", // slate-600
    borderRadius: "0.5rem",
    fontSize: "0.875rem",
    backgroundColor: "#1e293b", // slate-800
    color: "#f1f5f9", // slate-100
  },
  "&:focus-within": {
    border: "2px solid #8b5cf6", // purple-500
    outline: "none",
    boxShadow: "0 0 0 3px rgba(139, 92, 246, 0.1)",
  },
  ".cm-content": {
    padding: "0.75rem",
  },
  ".cm-line": {
    lineHeight: "1.5",
  },
});

const ReactAgentConfigModal = forwardRef<
  HTMLDialogElement,
  ReactAgentConfigModalProps
>(({ nodeData, onSave }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);
  const [activeTab, setActiveTab] = useState("basic");

  const [agentName, setAgentName] = useState(nodeData?.name || "ReAct Agent");
  const [verbose, setVerbose] = useState(nodeData?.verbose ?? true);
  const [handleErrors, setHandleErrors] = useState(
    nodeData?.handle_parsing_errors ?? true
  );
  const [promptTemplate, setPromptTemplate] = useState(
    nodeData?.prompt_template || nodeData?.system_prompt ||
      "You are a helpful assistant. Use tools to answer: {input}"
  );
  const { mode } = useThemeStore();

  // Update state when nodeData changes
  useEffect(() => {
    setAgentName(nodeData?.name || "ReAct Agent");
    setVerbose(nodeData?.verbose ?? true);
    setHandleErrors(nodeData?.handle_parsing_errors ?? true);
    setPromptTemplate(
      nodeData?.prompt_template || nodeData?.system_prompt ||
        "You are a helpful assistant. Use tools to answer: {input}"
    );
  }, [nodeData]);

  const handleSave = () => {
    onSave({
      name: agentName,
      verbose,
      handle_parsing_errors: handleErrors,
      prompt_template: promptTemplate,
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
        border border-slate-700/50 shadow-2xl shadow-purple-500/10 backdrop-blur-xl"
      >
        {/* Header */}
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-700/50">
          <div
            className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl 
            flex items-center justify-center shadow-lg"
          >
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-xl text-white">
              Agent Configuration
            </h3>
            <p className="text-slate-400 text-sm">
              Configure AI agent behavior and capabilities
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1 mb-6">
          {[
            { id: "basic", label: "Basic", icon: Settings },
            { id: "prompt", label: "Prompt", icon: MessageSquare },
            { id: "advanced", label: "Advanced", icon: Zap },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md 
                transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg"
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
            {/* Agent Identity */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center space-x-2 mb-4">
                <Bot className="w-5 h-5 text-purple-400" />
                <label className="text-white font-semibold">
                  Agent Identity
                </label>
              </div>

              <div>
                <label className="text-slate-300 text-sm mb-2 block">
                  Agent Name
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                    text-white placeholder-slate-400 px-4 py-3 focus:border-purple-500 focus:ring-2 
                    focus:ring-purple-500/20 transition-all"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Enter agent name..."
                />
                <div className="text-xs text-slate-400 mt-1">
                  A descriptive name for your AI agent
                </div>
              </div>
            </div>

            {/* Agent Type Information */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center space-x-2 mb-4">
                <Brain className="w-5 h-5 text-blue-400" />
                <label className="text-white font-semibold">Agent Type</label>
              </div>

              <div className="flex flex-col gap-4">
                {AGENT_TYPES.map((type) => (
                  <div
                    key={type.value}
                    className="p-4 bg-slate-900/50 rounded-lg border border-slate-600/30 hover:border-purple-500/50 transition-all"
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">{type.icon}</span>
                      <span className="text-slate-300 text-sm font-medium">
                        {type.label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      {type.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Agent Capabilities */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center space-x-2 mb-4">
                <Activity className="w-5 h-5 text-green-400" />
                <label className="text-white font-semibold">
                  Agent Capabilities
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-600/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <Eye className="w-4 h-4 text-green-400" />
                    <span className="text-slate-300 text-sm font-medium">
                      Tool Usage
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>• Access to external tools and APIs</div>
                    <div>• Dynamic tool selection</div>
                    <div>• Context-aware tool usage</div>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-600/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <Brain className="w-4 h-4 text-blue-400" />
                    <span className="text-slate-300 text-sm font-medium">
                      Reasoning
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>• Chain-of-thought reasoning</div>
                    <div>• Step-by-step problem solving</div>
                    <div>• Logical decision making</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Prompt Configuration Tab */}
        {activeTab === "prompt" && (
          <div className="space-y-6">
            {/* Prompt Template Editor */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center space-x-2 mb-4">
                <MessageSquare className="w-5 h-5 text-orange-400" />
                <label className="text-white font-semibold">
                  Prompt Template
                </label>
              </div>

              <div>
                <label className="text-slate-300 text-sm mb-2 block">
                  Template Editor
                </label>
                <CodeMirror
                  value={promptTemplate}
                  height="200px"
                  placeholder="You are a helpful assistant. Use tools to answer: {input}"
                  basicSetup={{
                    lineNumbers: false,
                    highlightActiveLine: false,
                    foldGutter: false,
                  }}
                  theme="dark"
                  extensions={[
                    syntaxHighlighting(curlyHighlight),
                    EditorView.lineWrapping,
                    customTheme,
                  ]}
                  onChange={(value) => setPromptTemplate(value)}
                />
                <div className="text-xs text-slate-400 mt-2">
                  Use {"{input}"} placeholder for user input. Supports variables
                  and conditional logic.
                </div>
              </div>
            </div>

            {/* Prompt Examples */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center space-x-2 mb-4">
                <Palette className="w-5 h-5 text-purple-400" />
                <label className="text-white font-semibold">
                  Template Examples
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PROMPT_EXAMPLES.map((example, index) => (
                  <div
                    key={index}
                    className="p-4 bg-slate-900/50 rounded-lg border border-slate-600/30 hover:border-purple-500/50 transition-all cursor-pointer"
                    onClick={() => setPromptTemplate(example.template)}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">{example.icon}</span>
                      <span className="text-slate-300 text-sm font-medium">
                        {example.name}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mb-2">
                      {example.description}
                    </div>
                    <div className="text-xs text-purple-400 font-mono bg-slate-800/50 p-2 rounded">
                      {example.template.substring(0, 60)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prompt Guidelines */}
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-500/20">
              <div className="flex items-center space-x-2 mb-4">
                <Key className="w-5 h-5 text-blue-400" />
                <label className="text-white font-semibold">
                  Prompt Guidelines
                </label>
              </div>
              <div className="text-xs text-slate-300 space-y-2">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400">•</span>
                  <span>
                    Be specific about the agent's role and capabilities
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400">•</span>
                  <span>
                    Include clear instructions for tool usage when needed
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400">•</span>
                  <span>
                    Use {"{input}"} placeholder for dynamic user input
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400">•</span>
                  <span>Keep prompts concise but comprehensive</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Configuration Tab */}
        {activeTab === "advanced" && (
          <div className="space-y-6">
            {/* Agent Behavior Settings */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center space-x-2 mb-4">
                <Settings className="w-5 h-5 text-emerald-400" />
                <label className="text-white font-semibold">
                  Behavior Settings
                </label>
              </div>

              <div className="space-y-4">
                <ToggleField
                  name="verbose"
                  icon={<Eye className="w-4 h-4" />}
                  label="Verbose Mode"
                  description="Show detailed reasoning steps and tool usage"
                  checked={verbose}
                  onChange={() => setVerbose(!verbose)}
                />

                <ToggleField
                  name="handle_parsing_errors"
                  icon={<Shield className="w-4 h-4" />}
                  label="Handle Parsing Errors"
                  description="Gracefully handle tool parsing and execution errors"
                  checked={handleErrors}
                  onChange={() => setHandleErrors(!handleErrors)}
                />
              </div>
            </div>

            {/* Performance Settings */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
              <div className="flex items-center space-x-2 mb-4">
                <Zap className="w-5 h-5 text-yellow-400" />
                <label className="text-white font-semibold">
                  Performance Settings
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-600/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <Play className="w-4 h-4 text-yellow-400" />
                    <span className="text-slate-300 text-sm font-medium">
                      Execution Mode
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>• Optimize for speed vs accuracy</div>
                    <div>• Parallel tool execution</div>
                    <div>• Resource usage optimization</div>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-600/30">
                  <div className="flex items-center space-x-2 mb-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="text-slate-300 text-sm font-medium">
                      Memory Management
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div>• Context window optimization</div>
                    <div>• Conversation history</div>
                    <div>• Memory cleanup strategies</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Agent Best Practices */}
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl p-6 border border-green-500/20">
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <label className="text-white font-semibold">
                  Agent Best Practices
                </label>
              </div>
              <div className="text-xs text-slate-300 space-y-2">
                <div className="flex items-start space-x-2">
                  <span className="text-green-400">•</span>
                  <span>
                    Enable verbose mode during development for debugging
                  </span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-green-400">•</span>
                  <span>Handle parsing errors for robust tool usage</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-green-400">•</span>
                  <span>Test agent behavior with various input types</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-green-400">•</span>
                  <span>
                    Monitor agent performance and adjust settings accordingly
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
            className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-600 
              hover:from-purple-400 hover:to-pink-500 text-white rounded-lg 
              shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105
              flex items-center space-x-2"
            onClick={handleSave}
          >
            <CheckCircle className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
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
  checked,
  onChange,
}: {
  name: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  onChange: () => void;
}) => (
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
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      <div
        className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer 
        peer-checked:after:translate-x-full peer-checked:after:border-white 
        after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
        after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all 
        peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-600"
      ></div>
    </label>
  </div>
);

export default ReactAgentConfigModal;
