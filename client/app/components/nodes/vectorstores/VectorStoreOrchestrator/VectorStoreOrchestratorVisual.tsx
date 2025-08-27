// VectorStoreOrchestratorVisual.tsx
import React from "react";
import { Position } from "@xyflow/react";
import { NeonHandle } from "~/components/common/NeonHandle";
import {
  Database,
  Trash,
  FileText,
  Search,
  BarChart3,
  Zap,
  Settings,
  Layers,
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  Tag,
  Hash,
  Filter,
} from "lucide-react";
import type { VectorStoreOrchestratorVisualProps } from "./types";

export default function VectorStoreOrchestratorVisual({
  data,
  isHovered,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onDelete,
  isHandleConnected,
}: VectorStoreOrchestratorVisualProps) {
  const getStatusColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "from-purple-500 to-pink-600";
      case "error":
        return "from-red-500 to-rose-600";
      default:
        return "from-purple-500 to-pink-600";
    }
  };

  const getGlowColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "shadow-purple-500/30";
      case "error":
        return "shadow-red-500/30";
      default:
        return "shadow-purple-500/30";
    }
  };

  // Check if metadata is configured
  const hasCustomMetadata =
    data.custom_metadata && data.custom_metadata !== "{}";
  const hasTablePrefix = data.table_prefix && data.table_prefix.trim() !== "";
  const hasMetadataStrategy =
    data.metadata_strategy && data.metadata_strategy !== "merge";

  return (
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
            src="icons/postgresql_vectorstore.svg"
            alt="vectorsotreicons"
            className="w-12 h-12 text-white drop-shadow-lg"
          />
          {/* Activity indicator */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
            <Database className="w-2 h-2 text-white" />
          </div>
        </div>
      </div>

      {/* Node title */}
      <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
        {data?.displayName || data?.name || "Orchestrator"}
      </div>

      {/* Metadata Configuration Badges */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 z-10 flex gap-1">
        {hasCustomMetadata && (
          <div className="px-2 py-1 rounded bg-purple-600 text-white text-xs font-bold shadow-lg">
            <Tag className="w-3 h-3 inline mr-1" />
            Meta
          </div>
        )}
        {hasTablePrefix && (
          <div className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold shadow-lg">
            <Hash className="w-3 h-3 inline mr-1" />
            Prefix
          </div>
        )}
        {hasMetadataStrategy && (
          <div className="px-2 py-1 rounded bg-orange-600 text-white text-xs font-bold shadow-lg">
            <Filter className="w-3 h-3 inline mr-1" />
            {data.metadata_strategy}
          </div>
        )}
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

      {/* Input Handles */}
      <NeonHandle
        type="target"
        position={Position.Left}
        id="documents"
        size={10}
        isConnectable={true}
        color1="#4ade80"
        glow={isHandleConnected("documents", false)}
        style={{ top: "30%" }}
      />
      <NeonHandle
        type="target"
        position={Position.Left}
        id="embedder"
        size={10}
        isConnectable={true}
        color1="#00FFFF"
        glow={isHandleConnected("embedder", false)}
        style={{ top: "70%" }}
      />

      {/* Output Handles */}
      <NeonHandle
        type="source"
        position={Position.Right}
        id="retriever"
        size={12}
        isConnectable={true}
        color1="#10b981"
        glow={isHandleConnected("retriever", true)}
      />

      {/* Input labels - Sol taraf */}
      <div
        className="absolute -left-20 text-xs text-gray-500 font-medium"
        style={{ top: "25%" }}
      >
        Documents
      </div>
      <div
        className="absolute -left-20 text-xs text-gray-500 font-medium"
        style={{ top: "65%" }}
      >
        Embedder
      </div>

      {/* Connection Status Indicator */}
      {data?.connection_status && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
          <div className="w-3 h-3 bg-purple-400 rounded-full shadow-lg animate-pulse"></div>
        </div>
      )}

      {/* Indexing Activity Indicator */}
      {data?.is_indexing && (
        <div className="absolute top-1 left-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <Activity className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Searching Activity Indicator */}
      {data?.is_searching && (
        <div className="absolute top-1 right-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
            <Search className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Document Count Indicator */}
      {data?.document_count && (
        <div className="absolute bottom-1 left-1 z-10">
          <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg animate-pulse flex items-center justify-center">
            <FileText className="w-1.5 h-1.5 text-white" />
          </div>
        </div>
      )}

      {/* Vector Count Indicator */}
      {data?.vector_count && (
        <div className="absolute bottom-1 right-1 z-10">
          <div className="w-3 h-3 bg-purple-400 rounded-full shadow-lg animate-pulse flex items-center justify-center">
            <BarChart3 className="w-1.5 h-1.5 text-white" />
          </div>
        </div>
      )}

      {/* Performance Indicator */}
      {data?.query_performance && (
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
