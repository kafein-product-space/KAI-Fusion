// DocumentRerankerVisual.tsx
import React from "react";
import { Position } from "@xyflow/react";
import {
  Settings,
  Trash,
  Zap,
  Activity,
  BarChart3,
  TrendingUp,
  Target,
  ArrowUpDown,
} from "lucide-react";
import NeonHandle from "~/components/common/NeonHandle";
import type { DocumentRerankerVisualProps } from "./types";

export default function DocumentRerankerVisual({
  data,
  isHovered,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onDelete,
  isHandleConnected,
}: DocumentRerankerVisualProps) {
  const getStatusColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "from-emerald-500 to-green-600";
      case "error":
        return "from-red-500 to-rose-600";
      default:
        return "from-orange-500 to-red-600";
    }
  };

  const getGlowColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "shadow-emerald-500/30";
      case "error":
        return "shadow-red-500/30";
      default:
        return "shadow-orange-500/30";
    }
  };

  return (
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
      onDoubleClick={onDoubleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title="Double click to configure"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>

      {/* Main icon */}
      <div className="relative z-10 mb-2">
        <div className="relative">
          <ArrowUpDown className="w-10 h-10 text-white drop-shadow-lg" />
          {/* Activity indicator */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center">
            <TrendingUp className="w-2 h-2 text-white" />
          </div>
        </div>
      </div>

      {/* Node title */}
      <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
        {data?.displayName || data?.name || "Reranker"}
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
            onClick={onDelete}
            title="Delete Node"
          >
            <Trash size={14} />
          </button>
        </>
      )}

      {/* Input Handle */}
      <NeonHandle
        type="target"
        position={Position.Left}
        id="retriever"
        isConnectable={true}
        size={10}
        color1="#00FFFF"
        glow={isHandleConnected("retriever")}
      />

      {/* Output Handles */}
      <NeonHandle
        type="source"
        position={Position.Right}
        id="reranked_retriever"
        isConnectable={true}
        size={10}
        color1="#f87171"
        glow={isHandleConnected("reranked_retriever", true)}
        style={{
          top: "20%",
        }}
      />

      <NeonHandle
        type="source"
        position={Position.Right}
        id="reranking_stats"
        isConnectable={true}
        size={10}
        color1="#ef4444"
        glow={isHandleConnected("reranking_stats", true)}
        style={{
          top: "40%",
        }}
      />

      <NeonHandle
        type="source"
        position={Position.Right}
        id="cost_analysis"
        isConnectable={true}
        size={10}
        color1="#dc2626"
        glow={isHandleConnected("cost_analysis", true)}
        style={{
          top: "60%",
        }}
      />

      <NeonHandle
        type="source"
        position={Position.Right}
        id="quality_metrics"
        isConnectable={true}
        size={10}
        color1="#b91c1c"
        glow={isHandleConnected("quality_metrics", true)}
        style={{
          top: "80%",
        }}
      />

      {/* Left side label for input */}
      <div className="absolute -left-20 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 font-medium">
        Retriever
      </div>

      {/* Right side labels for outputs */}
      <div
        className="absolute -right-22 text-xs text-gray-500 font-medium"
        style={{ top: "15%" }}
      >
        Reranked
      </div>
      <div
        className="absolute -right-22 text-xs text-gray-500 font-medium"
        style={{ top: "35%" }}
      >
        Stats
      </div>
      <div
        className="absolute -right-22 text-xs text-gray-500 font-medium"
        style={{ top: "55%" }}
      >
        Cost
      </div>
      <div
        className="absolute -right-22 text-xs text-gray-500 font-medium"
        style={{ top: "75%" }}
      >
        Quality
      </div>

      {/* Connection Status Indicator */}
      {data?.rerank_strategy && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
          <div className="w-3 h-3 bg-orange-400 rounded-full shadow-lg animate-pulse"></div>
        </div>
      )}

      {/* Strategy Type Badge */}
      {data?.rerank_strategy === "cohere" && (
        <div className="absolute top-1 left-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
            <Target className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Hybrid Strategy Badge */}
      {data?.rerank_strategy === "hybrid" && (
        <div className="absolute top-1 right-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
            <BarChart3 className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Reranking Activity Indicator */}
      {data?.is_reranking && (
        <div className="absolute bottom-1 left-1 z-10">
          <div className="w-3 h-3 bg-yellow-400 rounded-full shadow-lg animate-pulse"></div>
        </div>
      )}
    </div>
  );
}
