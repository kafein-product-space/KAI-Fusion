import React, { useRef, useState, useCallback } from "react";
import { useReactFlow, Position } from "@xyflow/react";
import {
  Bot,
  Trash,
  Activity,
  Brain,
  Zap,
  Target,
  Cpu,
  Sparkles,
  MessageSquare,
  Clock,
  Power,
  Wrench,
} from "lucide-react";
import AgentConfigModal from "../../modals/agents/AgentConfigModal";
import { NeonHandle } from "~/components/common/NeonHandle";

interface ToolAgentNodeProps {
  data: any;
  id: string;
}

const ToolAgentNode = React.memo(function ToolAgentNode({
  data,
  id,
}: ToolAgentNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const modalRef = useRef<HTMLDialogElement>(null);
  const edges = getEdges ? getEdges() : [];

  const isHandleConnected = (handleId: string, isSource = false) =>
    edges.some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );

  const handleOpenModal = useCallback(() => {
    modalRef.current?.showModal();
  }, []);

  const handleConfigSave = useCallback(
    (newConfig: any) => {
      setNodes((nodes: any[]) =>
        nodes.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, ...newConfig } }
            : node
        )
      );
    },
    [id, setNodes]
  );

  const handleDeleteNode = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setNodes((nodes) => nodes.filter((node) => node.id !== id));
    },
    [id, setNodes]
  );

  const getStatusColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "from-emerald-500 to-green-600";
      case "error":
        return "from-red-500 to-rose-600";
      default:
        return "from-purple-500 to-indigo-600";
    }
  };

  const getGlowColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "shadow-emerald-500/30";
      case "error":
        return "shadow-red-500/30";
      default:
        return "shadow-purple-500/30";
    }
  };

  const leftInputHandles = [
    { id: "start", label: "Start", required: true, position: 50 },
  ];

  const bottomInputHandles = [
    { id: "llm", label: "LLM", required: true, position: 20 },
    { id: "memory", label: "Memory", required: true, position: 50 },
    { id: "tools", label: "Tools", required: false, position: 80 },
  ];

  return (
    <>
      <div
        className={`relative group w-32 h-32 rounded-2xl flex flex-col items-center justify-center 
          cursor-pointer transition-all duration-300 transform
          ${isHovered ? "scale-105" : "scale-100"}
          bg-gradient-to-br ${getStatusColor()}
          ${
            isHovered
              ? `shadow-2xl ${getGlowColor()}`
              : "shadow-lg shadow-black/50"
          }
          border border-white/20 backdrop-blur-sm
          hover:border-white/40`}
        onDoubleClick={handleOpenModal}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Double click to configure"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>

        {/* Main icon */}
        <div className="relative z-10 mb-2">
          <div className="relative">
            <Bot className="w-12 h-12 text-white drop-shadow-lg" />
            {/* Activity indicator */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full flex items-center justify-center">
              <Brain className="w-2 h-2 text-white" />
            </div>
          </div>
        </div>

        {/* Node title */}
        <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
          {data?.displayName || data?.name || "Agent"}
        </div>

        {/* Agent type subtitle */}
        <div className="text-white/80 text-xs text-center drop-shadow-lg z-10 mt-1">
          {data?.agentType || "Tools Agent"}
        </div>

        {/* Hover effects */}
        {isHovered && (
          <>
            {/* Delete button */}
            <button
              className="absolute -top-3 -right-3 w-8 h-8 
                bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500
                text-white rounded-full border border-white/30 shadow-xl 
                transition-all duration-200 hover:scale-110 flex items-center justify-center z-20
                backdrop-blur-sm"
              onClick={handleDeleteNode}
              title="Delete Node"
            >
              <Trash size={14} />
            </button>
          </>
        )}

        {/* Left Input Handle */}
        {leftInputHandles.map((handle) => (
          <NeonHandle
            key={handle.id}
            type="target"
            position={Position.Left}
            id={handle.id}
            isConnectable={true}
            size={10}
            color1="#00FFFF"
            glow={isHandleConnected(handle.id)}
          />
        ))}

        {/* Bottom Input Handles */}
        {bottomInputHandles.map((handle) => (
          <NeonHandle
            key={handle.id}
            type="target"
            position={Position.Bottom}
            id={handle.id}
            size={10}
            color1={handle.required ? "#ef4444" : "#6b7280"}
            glow={isHandleConnected(handle.id)}
            style={{
              left: `${handle.position}%`,
            }}
          />
        ))}

        {/* Output Handle */}
        <NeonHandle
          type="source"
          position={Position.Right}
          id="output"
          isConnectable={true}
          size={10}
          color1="#8b5cf6"
          glow={isHandleConnected("output", true)}
        />

        {/* Left side label for input */}
        <div className="absolute -left-20 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 font-medium">
          Start
        </div>

        {/* Bottom side labels for inputs */}
        <div
          className="absolute -bottom-8 text-xs text-gray-500 font-medium"
          style={{ left: "15%" }}
        >
          LLM
        </div>
        <div
          className="absolute -bottom-8 text-xs text-gray-500 font-medium"
          style={{ left: "45%" }}
        >
          Memory
        </div>
        <div
          className="absolute -bottom-8 text-xs text-gray-500 font-medium"
          style={{ left: "75%" }}
        >
          Tools
        </div>

        {/* Right side label for output */}
        <div className="absolute -right-20 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 font-medium">
          Output
        </div>

        {/* Agent Type Badge */}
        {data?.agentType && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-purple-600 text-white text-xs font-bold shadow-lg">
              {data.agentType === "tools"
                ? "Tools"
                : data.agentType === "conversational"
                ? "Conversational"
                : data.agentType === "autonomous"
                ? "Autonomous"
                : data.agentType?.toUpperCase() || "AGENT"}
            </div>
          </div>
        )}

        {/* Connection Status Indicator */}
        {data?.agentType && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
            <div className="w-3 h-3 bg-purple-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}

        {/* Agent Activity Indicator */}
        {data?.is_thinking && (
          <div className="absolute top-1 left-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <Activity className="w-2 h-2 text-white" />
            </div>
          </div>
        )}

        {/* Agent Ready Indicator */}
        {data?.is_ready && (
          <div className="absolute top-1 right-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <Power className="w-2 h-2 text-white" />
            </div>
          </div>
        )}

        {/* Tool Usage Indicator */}
        {data?.tool_count && (
          <div className="absolute bottom-1 left-1 z-10">
            <div className="w-3 h-3 bg-blue-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}

        {/* Performance Indicator */}
        {data?.performance_metrics && (
          <div className="absolute bottom-1 right-1 z-10">
            <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}

        {/* Agent Type Badge */}
        {data?.agentType && (
          <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 z-10">
            <div className="px-2 py-1 rounded bg-indigo-600 text-white text-xs font-bold shadow-lg transform rotate-90">
              {data.agentType === "tools"
                ? "Tools"
                : data.agentType === "conversational"
                ? "Chat"
                : "Agent"}
            </div>
          </div>
        )}

        {/* Tool Count Indicator */}
        {data?.tool_count && (
          <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 z-10">
            <div className="px-2 py-1 rounded bg-purple-600 text-white text-xs font-bold shadow-lg transform -rotate-90">
              {data.tool_count}
            </div>
          </div>
        )}

        {/* Agent Status Badge */}
        {data?.agent_status && (
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold shadow-lg">
              {data.agent_status === "ready"
                ? "Ready"
                : data.agent_status === "thinking"
                ? "Thinking"
                : data.agent_status === "executing"
                ? "Executing"
                : data.agent_status === "completed"
                ? "Completed"
                : data.agent_status === "error"
                ? "Error"
                : "Active"}
            </div>
          </div>
        )}

        {/* Memory Usage Indicator */}
        {data?.memory_usage && (
          <div className="absolute top-1 right-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
              <MessageSquare className="w-2 h-2 text-white" />
            </div>
          </div>
        )}

        {/* Execution Time Indicator */}
        {data?.execution_time && (
          <div className="absolute bottom-1 left-1 z-10">
            <div className="w-3 h-3 bg-orange-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}

        {/* Tool Activity Indicator */}
        {data?.tool_activity && (
          <div className="absolute bottom-1 right-1 z-10">
            <div className="w-3 h-3 bg-purple-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}

        {/* Autonomous Mode Indicator */}
        {data?.is_autonomous && (
          <div className="absolute top-1 left-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
              <Zap className="w-2 h-2 text-white" />
            </div>
          </div>
        )}

        {/* Conversation Mode Indicator */}
        {data?.is_conversational && (
          <div className="absolute top-1 right-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <MessageSquare className="w-2 h-2 text-white" />
            </div>
          </div>
        )}

        {/* Tool Selection Indicator */}
        {data?.selected_tools && (
          <div className="absolute bottom-1 left-1 z-10">
            <div className="w-3 h-3 bg-yellow-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}

        {/* Response Quality Indicator */}
        {data?.response_quality && (
          <div className="absolute bottom-1 right-1 z-10">
            <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}
      </div>

      <AgentConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
      />
    </>
  );
});

ToolAgentNode.displayName = "ToolAgentNode";

export default ToolAgentNode;
