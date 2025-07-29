import React, { useRef, useState } from "react";
import { useReactFlow, Handle, Position } from "@xyflow/react";
import {
  Trash,
  MessageSquare,
  Activity,
  Zap,
  Brain,
  Sparkles,
  Bot,
  Cpu,
} from "lucide-react";

import OpenAIChatNodeModal from "../../modals/llms/OpenAIChatModal";
import NeonHandle from "~/components/common/NeonHandle";

interface OpenAIChatNodeProps {
  data: any;
  id: string;
}

function OpenAIChatNode({ data, id }: OpenAIChatNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const modalRef = useRef<HTMLDialogElement>(null);

  const handleOpenModal = () => {
    modalRef.current?.showModal();
  };

  const handleConfigSave = (newConfig: any) => {
    setNodes((nodes: any[]) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...newConfig } }
          : node
      )
    );
  };
  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };
  const edges = getEdges ? getEdges() : [];

  const isHandleConnected = (handleId: string, isSource = false) =>
    edges.some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
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

  return (
    <>
      {/* Ana node kutusu */}
      <div
        className={`relative group w-24 h-24 rounded-2xl flex flex-col items-center justify-center 
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
            <MessageSquare className="w-10 h-10 text-white drop-shadow-lg" />
            {/* Activity indicator */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-2 h-2 text-white" />
            </div>
          </div>
        </div>

        {/* Node title */}
        <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
          {data?.displayName || data?.name || "Chat"}
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

        {/* Output Handle */}
        <NeonHandle
          type="source"
          position={Position.Top}
          id="output"
          isConnectable={true}
          size={10}
          color1="#00FFFF"
          glow={isHandleConnected("output", true)}
        />

        {/* Top side label for output */}
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 font-medium">
          Response
        </div>

        {/* OpenAI Model Badge */}
        {data?.model && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-purple-600 text-white text-xs font-bold shadow-lg">
              {data.model === "gpt-4"
                ? "GPT-4"
                : data.model === "gpt-3.5-turbo"
                ? "GPT-3.5"
                : data.model === "gpt-4-turbo"
                ? "GPT-4 Turbo"
                : data.model?.toUpperCase() || "OPENAI"}
            </div>
          </div>
        )}

        {/* Connection Status Indicator */}
        {data?.model && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
            <div className="w-3 h-3 bg-purple-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}

        {/* Model Type Indicator */}
        {data?.model?.includes("gpt-4") && (
          <div className="absolute top-1 left-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <Brain className="w-2 h-2 text-white" />
            </div>
          </div>
        )}

        {/* Chat Activity Indicator */}
        {data?.is_generating && (
          <div className="absolute top-1 right-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <Activity className="w-2 h-2 text-white" />
            </div>
          </div>
        )}

        {/* Temperature Indicator */}
        {data?.temperature && (
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

        {/* Model Size Badge */}
        {data?.model && (
          <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 z-10">
            <div className="px-2 py-1 rounded bg-indigo-600 text-white text-xs font-bold shadow-lg transform rotate-90">
              {data.model?.includes("gpt-4")
                ? "4"
                : data.model?.includes("gpt-3.5")
                ? "3.5"
                : "AI"}
            </div>
          </div>
        )}

        {/* Chat Type Indicator */}
        {data?.chat_type && (
          <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 z-10">
            <div className="px-2 py-1 rounded bg-purple-600 text-white text-xs font-bold shadow-lg transform -rotate-90">
              {data.chat_type === "conversation"
                ? "Chat"
                : data.chat_type === "completion"
                ? "Complete"
                : "AI"}
            </div>
          </div>
        )}

        {/* OpenAI Status Badge */}
        {data?.openai_status && (
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold shadow-lg">
              {data.openai_status === "connected"
                ? "Connected"
                : data.openai_status === "error"
                ? "Error"
                : data.openai_status === "rate_limited"
                ? "Rate Limited"
                : "Ready"}
            </div>
          </div>
        )}

        {/* Cost Indicator */}
        {data?.estimated_cost && (
          <div className="absolute top-1 right-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <Zap className="w-2 h-2 text-white" />
            </div>
          </div>
        )}

        {/* Token Usage Indicator */}
        {data?.token_usage && (
          <div className="absolute bottom-1 left-1 z-10">
            <div className="w-3 h-3 bg-orange-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}
      </div>

      {/* DaisyUI dialog modal */}
      <OpenAIChatNodeModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default OpenAIChatNode;
