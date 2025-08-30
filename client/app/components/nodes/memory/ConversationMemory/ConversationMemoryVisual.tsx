// ConversationMemoryVisual.tsx
import React from "react";
import { Position } from "@xyflow/react";
import {
  MessageCircle,
  Trash,
  Activity,
  MessageSquare,
  Brain,
  Zap,
  Clock,
  Power,
  Users,
  History,
} from "lucide-react";
import NeonHandle from "~/components/common/NeonHandle";
import type { ConversationMemoryVisualProps } from "./types";

export default function ConversationMemoryVisual({
  data,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onDelete,
  isHandleConnected,
}: ConversationMemoryVisualProps) {
  const getStatusColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "from-emerald-500 to-green-600";
      case "error":
        return "from-red-500 to-rose-600";
      default:
        return "from-green-500 to-emerald-600";
    }
  };

  const getGlowColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "shadow-emerald-500/30";
      case "error":
        return "shadow-red-500/30";
      default:
        return "shadow-green-500/30";
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
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        title="Double click to configure"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>

        {/* Main icon */}
        <div className="relative z-10 mb-2">
          <div className="relative">
            <MessageCircle className="w-10 h-10 text-white drop-shadow-lg" />
            {/* Activity indicator */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <MessageSquare className="w-2 h-2 text-white" />
            </div>
          </div>
        </div>

        {/* Node title */}
        <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
          {data?.displayName || data?.name || "Memory"}
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
          isConnectable={true}
          size={10}
          color1="#00FFFF"
          glow={isHandleConnected("output", true)}
        />

        {/* Right side label for output */}
        <div className="absolute -right-20 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 font-medium">
          Memory
        </div>

        {/* Conversation Memory Type Badge */}
        {data?.memory_type && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-green-600 text-white text-xs font-bold shadow-lg">
              {data.memory_type === "conversation"
                ? "Conversation"
                : data.memory_type === "buffer"
                ? "Buffer"
                : data.memory_type === "summary"
                ? "Summary"
                : (data.memory_type as string)?.toUpperCase() || "MEMORY"}
            </div>
          </div>
        )}

        {/* Connection Status Indicator */}
        {data?.memory_key && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
            <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}

        {/* Memory Capacity Indicator */}
        {data?.k && (
          <div className="absolute top-1 left-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
              <Brain className="w-2 h-2 text-white" />
            </div>
          </div>
        )}

        {/* Memory Activity Indicator */}
        {data?.is_active && (
          <div className="absolute top-1 right-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <Activity className="w-2 h-2 text-white" />
            </div>
          </div>
        )}

        {/* Memory Usage Indicator */}
        {data?.current_usage && (
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

        {/* Memory Size Badge */}
        {data?.k && (
          <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 z-10">
            <div className="px-2 py-1 rounded bg-indigo-600 text-white text-xs font-bold shadow-lg transform rotate-90">
              {data.k}
            </div>
          </div>
        )}

        {/* Memory Type Indicator */}
        {data?.memory_type === "conversation" && (
          <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 z-10">
            <div className="px-2 py-1 rounded bg-green-600 text-white text-xs font-bold shadow-lg transform -rotate-90">
              Chat
            </div>
          </div>
        )}

        {/* Memory Status Badge */}
        {data?.memory_status && (
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold shadow-lg">
              {data.memory_status === "active"
                ? "Active"
                : data.memory_status === "full"
                ? "Full"
                : data.memory_status === "empty"
                ? "Empty"
                : "Ready"}
            </div>
          </div>
        )}

        {/* Conversation Count Indicator */}
        {data?.conversation_count && (
          <div className="absolute top-1 right-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
              <Users className="w-2 h-2 text-white" />
            </div>
          </div>
        )}

        {/* History Length Indicator */}
        {data?.history_length && (
          <div className="absolute bottom-1 left-1 z-10">
            <div className="w-3 h-3 bg-orange-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}

        {/* Memory Performance Indicator */}
        {data?.memory_performance && (
          <div className="absolute bottom-1 right-1 z-10">
            <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}

        {/* Auto Cleanup Indicator */}
        {data?.auto_cleanup && (
          <div className="absolute top-1 left-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
              <Zap className="w-2 h-2 text-white" />
            </div>
          </div>
        )}

        {/* History Retention Indicator */}
        {data?.history_retention && (
          <div className="absolute top-1 right-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
              <History className="w-2 h-2 text-white" />
            </div>
          </div>
        )}
      </div>
    </>
  );
}