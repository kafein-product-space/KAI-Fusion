// OpenAIDocumentEmbedderVisual.tsx
import React from "react";
import { Position } from "@xyflow/react";
import {
  Sparkles,
  Trash,
  FileText,
  Activity,
  Database,
  Brain,
  Zap,
  Layers,
  Cpu,
} from "lucide-react";
import NeonHandle from "~/components/common/NeonHandle";
import type { OpenAIDocumentEmbedderVisualProps } from "./types";

export default function OpenAIDocumentEmbedderVisual({
  data,
  isHovered,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onDelete,
  isHandleConnected,
}: OpenAIDocumentEmbedderVisualProps) {
  const getStatusColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "from-emerald-500 to-green-600";
      case "error":
        return "from-red-500 to-rose-600";
      default:
        return "from-blue-500 to-indigo-600";
    }
  };

  const getGlowColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "shadow-emerald-500/30";
      case "error":
        return "shadow-red-500/30";
      default:
        return "shadow-blue-500/30";
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
          <FileText className="w-10 h-10 text-white drop-shadow-lg" />
          {/* Activity indicator */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
            <Sparkles className="w-2 h-2 text-white" />
          </div>
        </div>
      </div>

      {/* Node title */}
      <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
        {data?.displayName || data?.name || "Embedder"}
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
        id="chunks"
        isConnectable={true}
        size={10}
        color1="#00FFFF"
        glow={isHandleConnected("chunks")}
      />

      {/* Output Handles */}
      <NeonHandle
        type="source"
        position={Position.Right}
        id="embedded_docs"
        isConnectable={true}
        size={10}
        color1="#0ea5e9"
        glow={isHandleConnected("embedded_docs", true)}
        style={{
          top: "25%",
        }}
      />

      <NeonHandle
        type="source"
        position={Position.Right}
        id="vectors"
        isConnectable={true}
        size={10}
        color1="#0284c7"
        glow={isHandleConnected("vectors", true)}
        style={{
          top: "50%",
        }}
      />

      <NeonHandle
        type="source"
        position={Position.Right}
        id="embedding_stats"
        isConnectable={true}
        size={10}
        color1="#0369a1"
        glow={isHandleConnected("embedding_stats", true)}
        style={{
          top: "75%",
        }}
      />

      {/* Left side label for input */}
      <div className="absolute -left-20 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 font-medium">
        Chunks
      </div>

      {/* Right side labels for outputs */}
      <div
        className="absolute -right-22 text-xs text-gray-500 font-medium"
        style={{ top: "20%" }}
      >
        Docs
      </div>
      <div
        className="absolute -right-22 text-xs text-gray-500 font-medium"
        style={{ top: "45%" }}
      >
        Vectors
      </div>
      <div
        className="absolute -right-22 text-xs text-gray-500 font-medium"
        style={{ top: "70%" }}
      >
        Stats
      </div>

      {/* OpenAI Embedder Type Badge */}
      {data?.embedding_model && (
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
          <div className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold shadow-lg">
            {data.embedding_model === "text-embedding-3-small"
              ? "3-Small"
              : data.embedding_model === "text-embedding-3-large"
              ? "3-Large"
              : data.embedding_model === "text-embedding-ada-002"
              ? "Ada-002"
              : data.embedding_model?.toUpperCase() || "OPENAI"}
          </div>
        </div>
      )}

      {/* Connection Status Indicator */}
      {data?.embedding_model && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
          <div className="w-3 h-3 bg-blue-400 rounded-full shadow-lg animate-pulse"></div>
        </div>
      )}

      {/* Embedding Model Type Indicator */}
      {data?.embedding_model?.includes("3-large") && (
        <div className="absolute top-1 left-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
            <Brain className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Embedding Activity Indicator */}
      {data?.is_embedding && (
        <div className="absolute top-1 right-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <Activity className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Dimension Indicator */}
      {data?.embedding_dimensions && (
        <div className="absolute bottom-1 left-1 z-10">
          <div className="w-3 h-3 bg-purple-400 rounded-full shadow-lg animate-pulse"></div>
        </div>
      )}

      {/* Performance Indicator */}
      {data?.performance_metrics && (
        <div className="absolute bottom-1 right-1 z-10">
          <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg animate-pulse"></div>
        </div>
      )}

      {/* Embedding Size Badge */}
      {data?.embedding_dimensions && (
        <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 z-10">
          <div className="px-2 py-1 rounded bg-indigo-600 text-white text-xs font-bold shadow-lg transform rotate-90">
            {data.embedding_dimensions}
          </div>
        </div>
      )}

      {/* Embedding Type Indicator */}
      {data?.embedding_type && (
        <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 z-10">
          <div className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold shadow-lg transform -rotate-90">
            {data.embedding_type === "document"
              ? "Doc"
              : data.embedding_type === "chunk"
              ? "Chunk"
              : "Embed"}
          </div>
        </div>
      )}

      {/* Embedding Status Badge */}
      {data?.embedding_status && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 z-10">
          <div className="px-2 py-1 rounded bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold shadow-lg">
            {data.embedding_status === "processing"
              ? "Processing"
              : data.embedding_status === "completed"
              ? "Completed"
              : data.embedding_status === "error"
              ? "Error"
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

      {/* Vector Count Indicator */}
      {data?.vector_count && (
        <div className="absolute bottom-1 right-1 z-10">
          <div className="w-3 h-3 bg-blue-400 rounded-full shadow-lg animate-pulse"></div>
        </div>
      )}
    </div>
  );
}
