// CohereRerankerVisual.tsx
import React from "react";
import { Position } from "@xyflow/react";
import { NeonHandle } from "~/components/common/NeonHandle";
import {
  Filter,
  Trash,
  Activity,
  Zap,
  Key,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
} from "lucide-react";
import type { CohereRerankerVisualProps } from "./types";

export default function CohereRerankerVisual({
  data,
  isHovered,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onDelete,
  isHandleConnected,
}: CohereRerankerVisualProps) {
  const getStatusColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "from-orange-500 to-red-600";
      case "error":
        return "from-red-500 to-rose-600";
      default:
        return "from-orange-500 to-red-600";
    }
  };

  const getGlowColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "shadow-orange-500/30";
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
          <img
            src="icons/cohere.svg"
            alt="coherererankericons"
            className="w-8 h-8 text-white drop-shadow-lg"
          />
          {/* Activity indicator */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center">
            <Key className="w-2 h-2 text-white" />
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

      {/* Output Handle */}
      <NeonHandle
        type="source"
        position={Position.Right}
        id="output"
        size={10}
        isConnectable={true}
        color1="#3b82f6"
        glow={isHandleConnected("output", true)}
      />

      {/* Connection Status Indicator */}
      {data?.connection_status && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
          <div className="w-3 h-3 bg-orange-400 rounded-full shadow-lg animate-pulse"></div>
        </div>
      )}

      {/* Reranking Activity Indicator */}
      {data?.is_reranking && (
        <div className="absolute top-1 left-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <Activity className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Reranked Count Indicator */}
      {data?.reranked_count && (
        <div className="absolute top-1 right-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-xs text-white font-bold">
              {data.reranked_count}
            </span>
          </div>
        </div>
      )}

      {/* Processing Time Indicator */}
      {data?.processing_time && (
        <div className="absolute bottom-1 left-1 z-10">
          <div className="w-3 h-3 bg-blue-400 rounded-full shadow-lg animate-pulse flex items-center justify-center">
            <Clock className="w-1.5 h-1.5 text-white" />
          </div>
        </div>
      )}

      {/* Accuracy Score Indicator */}
      {data?.accuracy_score && (
        <div className="absolute bottom-1 right-1 z-10">
          <div className="w-3 h-3 bg-purple-400 rounded-full shadow-lg animate-pulse flex items-center justify-center">
            <TrendingUp className="w-1.5 h-1.5 text-white" />
          </div>
        </div>
      )}

      {/* Throughput Indicator */}
      {data?.throughput && (
        <div className="absolute top-1 left-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
            <Zap className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Error Status Indicator */}
      {data?.error_message && (
        <div className="absolute top-1 right-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-red-400 to-rose-500 rounded-full flex items-center justify-center shadow-lg">
            <AlertCircle className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Last Operation Indicator */}
      {data?.last_operation && (
        <div className="absolute bottom-1 left-1 z-10">
          <div className="w-3 h-3 bg-blue-400 rounded-full shadow-lg animate-pulse flex items-center justify-center">
            <Clock className="w-1.5 h-1.5 text-white" />
          </div>
        </div>
      )}

      {/* Success Status Indicator */}
      {data?.validationStatus === "success" && (
        <div className="absolute bottom-1 right-1 z-10">
          <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg animate-pulse flex items-center justify-center">
            <CheckCircle className="w-1.5 h-1.5 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}
