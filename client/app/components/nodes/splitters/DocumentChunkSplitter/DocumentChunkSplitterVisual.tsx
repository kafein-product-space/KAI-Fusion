// DocumentChunkSplitterVisual.tsx
import React from "react";
import { Position } from "@xyflow/react";
import { Scissors, Trash, FileText, BarChart3, Eye, Zap } from "lucide-react";
import NeonHandle from "~/components/common/NeonHandle";
import type { DocumentChunkSplitterVisualProps } from "./types";

export default function DocumentChunkSplitterVisual({
  data,
  isHovered,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onDelete,
  isHandleConnected,
}: DocumentChunkSplitterVisualProps) {
  const getStatusColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "from-emerald-500 to-teal-600";
      case "error":
        return "from-red-500 to-rose-600";
      default:
        return "from-yellow-500 to-orange-600";
    }
  };

  const getGlowColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "shadow-emerald-500/30";
      case "error":
        return "shadow-red-500/30";
      default:
        return "shadow-yellow-500/30";
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
          <Scissors className="w-10 h-10 text-white drop-shadow-lg" />
          {/* Activity indicator */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-orange-400 to-yellow-500 rounded-full flex items-center justify-center">
            <Zap className="w-2 h-2 text-white" />
          </div>
        </div>
      </div>

      {/* Node title */}
      <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
        {data?.displayName || data?.name || "Chunk Splitter"}
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

      {/* Input Handle - Documents */}
      <NeonHandle
        type="target"
        position={Position.Left}
        id="documents"
        isConnectable={true}
        size={10}
        color1="#00FFFF"
        glow={isHandleConnected("documents")}
      />

      {/* Output Handles */}
      <NeonHandle
        type="source"
        position={Position.Right}
        id="chunks"
        isConnectable={true}
        size={10}
        color1="#facc15"
        glow={isHandleConnected("chunks", true)}
      />

      {/* Handle labels */}
      <div className="absolute -left-20 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 font-medium">
        Documents
      </div>

      {/* Right side labels for outputs */}
      <div className="absolute -right-16 text-xs text-gray-500 font-medium">
        Chunks
      </div>

      {/* Processing Status Indicator */}
      {data?.processing && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
          <div className="w-3 h-3 bg-yellow-400 rounded-full shadow-lg animate-pulse"></div>
        </div>
      )}

      {/* Chunk Count Indicator */}
      {data?.chunkCount && (
        <div className="absolute bottom-1 left-1 z-10">
          <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg animate-pulse"></div>
        </div>
      )}

      {/* Average Chunk Size Indicator */}
      {data?.averageChunkSize && (
        <div className="absolute bottom-1 right-1 z-10">
          <div className="w-3 h-3 bg-blue-400 rounded-full shadow-lg animate-pulse"></div>
        </div>
      )}

      {/* Split Status Badge */}
      {data?.splitStatus && (
        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 z-10">
          <div className="px-2 py-1 rounded bg-gradient-to-r from-orange-500 to-yellow-600 text-white text-xs font-bold shadow-lg">
            {data.splitStatus === "processing"
              ? "Processing"
              : data.splitStatus === "completed"
              ? "Completed"
              : data.splitStatus === "error"
              ? "Error"
              : "Ready"}
          </div>
        </div>
      )}

      {/* Processing Time Indicator */}
      {data?.processingTime && (
        <div className="absolute top-1 right-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
            <BarChart3 className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Total Characters Indicator */}
      {data?.totalCharacters && (
        <div className="absolute top-1 left-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
            <FileText className="w-2 h-2 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}
