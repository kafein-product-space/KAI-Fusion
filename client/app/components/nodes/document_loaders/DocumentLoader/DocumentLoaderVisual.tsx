// DocumentLoaderVisual.tsx
import React from "react";
import { Position } from "@xyflow/react";
import { NeonHandle } from "~/components/common/NeonHandle";
import {
  FileText,
  Trash,
  Activity,
  Upload,
  Download,
  Database,
  File,
  Globe,
  Zap,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Settings,
  Archive,
  Filter,
  BarChart3,
} from "lucide-react";
import type { DocumentLoaderVisualProps } from "./types";

export default function DocumentLoaderVisual({
  data,
  isHovered,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onDelete,
  isHandleConnected,
}: DocumentLoaderVisualProps) {
  const getStatusColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "from-emerald-500 to-green-600";
      case "error":
        return "from-red-500 to-rose-600";
      default:
        return "from-emerald-500 to-green-600";
    }
  };

  const getGlowColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "shadow-emerald-500/30";
      case "error":
        return "shadow-red-500/30";
      default:
        return "shadow-emerald-500/30";
    }
  };

  const getProcessingStatus = () => {
    if (data.processing_status === "processing") return "Processing";
    if (data.processing_status === "completed") return "Completed";
    if (data.processing_status === "error") return "Error";
    if (data.processing_status === "idle") return "Idle";
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
          <FileText className="w-10 h-10 text-white drop-shadow-lg" />
          {/* Activity indicator */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center">
            <Upload className="w-2 h-2 text-white" />
          </div>
        </div>
      </div>

      {/* Node title */}
      <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
        {data?.displayName || data?.name || "Loader"}
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
        position={Position.Bottom}
        id="input"
        size={10}
        isConnectable={true}
        color1="#3b82f6"
        glow={isHandleConnected("input", false)}
      />

      {/* Bottom side label for input */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 font-medium">
        Trigger
      </div>

      {/* Output Handle */}
      <NeonHandle
        type="source"
        position={Position.Top}
        id="output"
        size={10}
        isConnectable={true}
        color1="#10b981"
        glow={isHandleConnected("output", true)}
      />

      {/* Top side label for output */}
      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 font-medium">
        Documents
      </div>

      {/* Processing Activity Indicator */}
      {data?.processing_status === "processing" && (
        <div className="absolute top-1 left-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
            <Activity className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Storage Status Indicator */}
      {data?.storage_enabled && (
        <div className="absolute top-1 right-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
            <Database className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Quality Threshold Indicator */}
      {data?.quality_threshold && (
        <div className="absolute bottom-1 left-1 z-10">
          <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg animate-pulse flex items-center justify-center">
            <Filter className="w-1.5 h-1.5 text-white" />
          </div>
        </div>
      )}

      {/* Deduplication Indicator */}
      {data?.deduplicate && (
        <div className="absolute bottom-1 right-1 z-10">
          <div className="w-3 h-3 bg-blue-400 rounded-full shadow-lg animate-pulse flex items-center justify-center">
            <CheckCircle className="w-1.5 h-1.5 text-white" />
          </div>
        </div>
      )}

      {/* Processing Status Badge */}
      {data?.processing_status && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 z-10">
          <div className="px-2 py-1 rounded bg-gradient-to-r from-emerald-500 to-green-600 text-white text-xs font-bold shadow-lg">
            {getProcessingStatus()}
          </div>
        </div>
      )}

      {/* Document Count Indicator */}
      {data?.document_count && (
        <div className="absolute top-1 right-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-xs text-white font-bold">
              {data.document_count}
            </span>
          </div>
        </div>
      )}

      {/* Error Indicator */}
      {data?.has_error && (
        <div className="absolute bottom-1 left-1 z-10">
          <div className="w-3 h-3 bg-red-400 rounded-full shadow-lg animate-pulse flex items-center justify-center">
            <XCircle className="w-1.5 h-1.5 text-white" />
          </div>
        </div>
      )}

      {/* File Size Indicator */}
      {data?.total_size && (
        <div className="absolute bottom-1 right-1 z-10">
          <div className="w-3 h-3 bg-purple-400 rounded-full shadow-lg animate-pulse flex items-center justify-center">
            <BarChart3 className="w-1.5 h-1.5 text-white" />
          </div>
        </div>
      )}

      {/* Processing Time Indicator */}
      {data?.processing_time && (
        <div className="absolute top-1 left-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
            <Clock className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Source Type Indicator */}
      {data?.source_type && (
        <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 z-10">
          <div className="px-2 py-1 rounded bg-emerald-600 text-white text-xs font-bold shadow-lg transform -rotate-90">
            {data.source_type === "web_only"
              ? "Web"
              : data.source_type === "files_only"
              ? "Files"
              : "Mixed"}
          </div>
        </div>
      )}

      {/* Storage Enabled Indicator */}
      {data?.storage_enabled && (
        <div className="absolute top-1 right-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
            <Archive className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Deduplication Enabled Indicator */}
      {data?.deduplicate && (
        <div className="absolute bottom-1 left-1 z-10">
          <div className="w-3 h-3 bg-blue-400 rounded-full shadow-lg animate-pulse flex items-center justify-center">
            <Filter className="w-1.5 h-1.5 text-white" />
          </div>
        </div>
      )}

      {/* Processing Stats Indicator */}
      {data?.processing_stats && (
        <div className="absolute bottom-1 right-1 z-10">
          <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg animate-pulse flex items-center justify-center">
            <BarChart3 className="w-1.5 h-1.5 text-white" />
          </div>
        </div>
      )}

      {/* Error Status Indicator */}
      {data?.error_status && (
        <div className="absolute top-1 left-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-red-400 to-rose-500 rounded-full flex items-center justify-center shadow-lg">
            <AlertCircle className="w-2 h-2 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}
