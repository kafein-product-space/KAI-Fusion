// OpenAIEmbeddingsProviderVisual.tsx
import React from "react";
import { Position } from "@xyflow/react";
import {
  Brain,
  Trash,
  Activity,
  Zap,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Database,
  Clock,
  BarChart3,
  Cpu,
  Globe,
} from "lucide-react";
import NeonHandle from "~/components/common/NeonHandle";
import type { OpenAIEmbeddingsProviderVisualProps } from "./types";

export default function OpenAIEmbeddingsProviderVisual({
  data,
  isHovered,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onDelete,
  isHandleConnected,
}: OpenAIEmbeddingsProviderVisualProps) {
  const getStatusColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "from-cyan-500 to-blue-600";
      case "error":
        return "from-red-500 to-rose-600";
      default:
        return "from-cyan-500 to-blue-600";
    }
  };

  const getGlowColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "shadow-cyan-500/30";
      case "error":
        return "shadow-red-500/30";
      default:
        return "shadow-cyan-500/30";
    }
  };

  const getModelLabel = () => {
    return data.model || "text-embedding-3-small";
  };

  const getConnectionStatus = () => {
    if (data.connection_status === "connected") return "Connected";
    if (data.connection_status === "error") return "Error";
    if (data.connection_status === "connecting") return "Connecting";
    return "Ready";
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
          {/* OpenAI logo background circle */}
          <div className="w-10 h-10 rounded-full flex items-center justify-center">
            <img
              src="icons/openai.svg"
              alt="openaiicons"
              className="w-10 h-10 text-white"
            />
          </div>
          {/* Activity indicator */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
            <Brain className="w-2 h-2 text-white" />
          </div>
        </div>
      </div>

      {/* Node title */}
      <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
        {data?.displayName || data?.name || "OpenAI"}
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

      {/* Output Handle */}
      <NeonHandle
        type="source"
        position={Position.Right}
        id="embeddings"
        size={10}
        isConnectable={true}
        color1="#00FFFF"
        glow={isHandleConnected("embeddings", true)}
      />

      {/* API Key Status Indicator */}
      {data?.api_key_configured && (
        <div className="absolute top-1 left-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
            <CheckCircle className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Connection Status Indicator */}
      {data?.connection_status === "connected" && (
        <div className="absolute top-1 right-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
            <Globe className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Processing Activity Indicator */}
      {data?.processing_status === "processing" && (
        <div className="absolute bottom-1 left-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <Activity className="w-2 h-2 text-white animate-spin" />
          </div>
        </div>
      )}

      {/* Error Indicator */}
      {data?.has_error && (
        <div className="absolute bottom-1 right-1 z-10">
          <div className="w-3 h-3 bg-red-400 rounded-full shadow-lg animate-pulse flex items-center justify-center">
            <XCircle className="w-1.5 h-1.5 text-white" />
          </div>
        </div>
      )}

      {/* Rate Limit Indicator */}
      {data?.rate_limited && (
        <div className="absolute bottom-1 left-1 z-10">
          <div className="w-3 h-3 bg-yellow-400 rounded-full shadow-lg animate-pulse flex items-center justify-center">
            <Clock className="w-1.5 h-1.5 text-white" />
          </div>
        </div>
      )}

      {/* Token Usage Indicator */}
      {data?.token_usage && (
        <div className="absolute bottom-1 right-1 z-10">
          <div className="w-3 h-3 bg-purple-400 rounded-full shadow-lg animate-pulse flex items-center justify-center">
            <BarChart3 className="w-1.5 h-1.5 text-white" />
          </div>
        </div>
      )}

      {/* Batch Processing Indicator */}
      {data?.batch_processing && (
        <div className="absolute top-1 right-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
            <Database className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Performance Indicator */}
      {data?.performance_optimized && (
        <div className="absolute top-1 left-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
            <Zap className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Connection Status Badge */}
      {data?.connection_status && (
        <div className="absolute -bottom-2 right-1/2 transform translate-x-1/2 z-10">
          <div
            className={`px-2 py-0.5 rounded text-white text-xs font-bold shadow-lg ${
              data.connection_status === "connected"
                ? "bg-gradient-to-r from-green-500 to-emerald-600"
                : data.connection_status === "error"
                ? "bg-gradient-to-r from-red-500 to-rose-600"
                : "bg-gradient-to-r from-yellow-500 to-orange-600"
            }`}
          >
            {getConnectionStatus()}
          </div>
        </div>
      )}

      {/* Request Count Indicator */}
      {data?.request_count && (
        <div className="absolute top-1 right-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-xs text-white font-bold">
              {data.request_count > 999 ? "999+" : data.request_count}
            </span>
          </div>
        </div>
      )}

      {/* Cache Status Indicator */}
      {data?.cache_enabled && (
        <div className="absolute bottom-1 left-1 z-10">
          <div className="w-3 h-3 bg-blue-400 rounded-full shadow-lg animate-pulse flex items-center justify-center">
            <Cpu className="w-1.5 h-1.5 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}
