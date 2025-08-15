// TavilyWebSearchVisual.tsx
import React from "react";
import { Position } from "@xyflow/react";
import {
  Search,
  Trash,
  Zap,
  Activity,
  Globe,
  Sparkles,
  BarChart3,
  Eye,
} from "lucide-react";
import NeonHandle from "~/components/common/NeonHandle";
import type { TavilyWebSearchVisualProps } from "./types";

export default function TavilyWebSearchVisual({
  data,
  isHovered,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onDelete,
  isHandleConnected,
}: TavilyWebSearchVisualProps) {
  const getStatusColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "from-emerald-500 to-green-600";
      case "error":
        return "from-red-500 to-rose-600";
      default:
        return "from-blue-500 to-cyan-600";
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
          <img
            src="icons/tavily_search.svg"
            alt="tavilyicons"
            className=" text-white drop-shadow-lg"
          />
          {/* Activity indicator */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center">
            <Globe className="w-2 h-2 text-white" />
          </div>
        </div>
      </div>

      {/* Node title */}
      <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
        {data?.displayName || data?.name || "Tavily"}
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
        position={Position.Top}
        id="output"
        isConnectable={true}
        size={10}
        color1="#00FFFF"
        glow={isHandleConnected("output", true)}
      />

      {/* Search Type Badge */}
      {data?.search_type === "basic" && (
        <div className="absolute top-1 left-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
            <Search className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Advanced Search Badge */}
      {data?.search_type === "advanced" && (
        <div className="absolute top-1 right-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
            <Sparkles className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Search Activity Indicator */}
      {data?.is_searching && (
        <div className="absolute bottom-1 left-1 z-10">
          <div className="w-3 h-3 bg-yellow-400 rounded-full shadow-lg animate-pulse"></div>
        </div>
      )}

      {/* Results Count Indicator */}
      {data?.results_count && (
        <div className="absolute bottom-1 right-1 z-10">
          <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg animate-pulse"></div>
        </div>
      )}
    </div>
  );
}
