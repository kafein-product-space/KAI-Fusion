// CodeVisual.tsx
import React from "react";
import { Position } from "@xyflow/react";
import {
  Code,
  Trash,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Terminal,
  FileCode,
  Cpu,
  Activity,
  AlertCircle,
  Layers,
  RotateCcw,
} from "lucide-react";
import NeonHandle from "~/components/common/NeonHandle";
import type { CodeNodeVisualProps } from "./types";

export default function CodeVisual({
  data,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  onDelete,
  isHandleConnected,
}: CodeNodeVisualProps) {
  const getStatusColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "from-emerald-500 to-green-600";
      case "error":
        return "from-red-500 to-rose-600";
      case "warning":
        return "from-yellow-500 to-orange-600";
      default:
        return "from-gray-500 to-slate-600";
    }
  };

  const getGlowColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "shadow-emerald-500/30";
      case "error":
        return "shadow-red-500/30";
      case "warning":
        return "shadow-yellow-500/30";
      default:
        return "shadow-gray-500/30";
    }
  };

  const getLanguageIcon = () => {
    switch (data.language) {
      case "python":
        return "/icons/python-icon.svg";
      case "javascript":
        return "/icons/js-icon.png";
      default:
        return null;
    }
  };

  const getLanguageColor = () => {
    switch (data.language) {
      case "python":
        return "from-blue-500 to-green-500";
      case "javascript":
        return "from-yellow-500 to-orange-500";
      default:
        return "from-gray-500 to-slate-600";
    }
  };

  const getModeIcon = () => {
    switch (data.mode) {
      case "all_items":
        return <Layers className="w-3 h-3 text-white" />;
      case "each_item":
        return <RotateCcw className="w-3 h-3 text-white" />;
      default:
        return <Code className="w-3 h-3 text-white" />;
    }
  };

  return (
    <>
      {/* Main node container */}
      <div
        className={`relative group w-28 h-28 rounded-2xl flex flex-col items-center justify-center 
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
        <div className="absolute inset-2 rounded-xl border border-white/10"></div>

        {/* Main icon */}
        <div className="relative z-10 mb-2">
          <div className="relative">
            <Code className="w-11 h-11 text-white drop-shadow-lg" />
            {/* Language indicator */}
            {getLanguageIcon() && (
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm">
                <img
                  src={getLanguageIcon() || ""}
                  alt={`${data.language || "unknown"} icon`}
                  className="w-4 h-4 object-contain"
                />
              </div>
            )}
            {/* Execution status indicator */}
            {data.is_executing && (
              <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center animate-pulse">
                <Play className="w-2 h-2 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Node title */}
        <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
          {data?.displayName || data?.name || "Code"}
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
          id="input_data"
          isConnectable={true}
          size={10}
          color1="#FF6B6B"
          glow={isHandleConnected("input_data", false)}
        />

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

        {/* Execution Status */}
        {data.execution_results && (
          <div className="absolute top-1 right-1 z-10">
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center shadow-lg ${
                data.execution_results.success
                  ? "bg-gradient-to-r from-green-400 to-emerald-500"
                  : "bg-gradient-to-r from-red-400 to-rose-500"
              }`}
            >
              {data.execution_results.success ? (
                <CheckCircle className="w-2 h-2 text-white" />
              ) : (
                <XCircle className="w-2 h-2 text-white" />
              )}
            </div>
          </div>
        )}

        {/* Continue on Error Indicator */}
        {data?.continue_on_error && (
          <div className="absolute bottom-1 left-1 z-10">
            <div
              className="w-3 h-3 bg-orange-400 rounded-full shadow-lg animate-pulse"
              title="Continue on Error"
            >
              <AlertCircle className="w-2 h-2 text-white m-0.5" />
            </div>
          </div>
        )}

        {/* Performance Indicator */}
        {data.execution_results?.execution_time && (
          <div className="absolute bottom-1 right-1 z-10">
            <div
              className={`w-3 h-3 rounded-full shadow-lg animate-pulse ${
                data.execution_results.execution_time < 1000
                  ? "bg-green-400"
                  : data.execution_results.execution_time < 5000
                  ? "bg-yellow-400"
                  : "bg-red-400"
              }`}
              title={`${data.execution_results.execution_time.toFixed(0)}ms`}
            >
              <Zap className="w-2 h-2 text-white m-0.5" />
            </div>
          </div>
        )}

        {/* Total Executions Badge */}
        {data?.total_executions && data.total_executions > 0 && (
          <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 z-10">
            <div className="px-2 py-1 rounded bg-indigo-600 text-white text-xs font-bold shadow-lg transform rotate-90">
              {data.total_executions}
            </div>
          </div>
        )}

        {/* Success Rate Indicator */}
        {data?.success_rate !== undefined &&
          data.total_executions &&
          data.total_executions > 0 && (
            <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 z-10">
              <div
                className={`px-2 py-1 rounded text-white text-xs font-bold shadow-lg transform -rotate-90 ${
                  data.success_rate >= 0.9
                    ? "bg-green-600"
                    : data.success_rate >= 0.7
                    ? "bg-yellow-600"
                    : "bg-red-600"
                }`}
              >
                {Math.round(data.success_rate * 100)}%
              </div>
            </div>
          )}

        {/* Last Execution Time */}
        {data?.last_execution_time && (
          <div className="absolute top-1/3 -right-8 transform -translate-y-1/2 z-10">
            <div
              className="w-2 h-2 bg-cyan-400 rounded-full shadow-lg animate-pulse"
              title={`Last run: ${new Date(
                data.last_execution_time
              ).toLocaleString()}`}
            ></div>
          </div>
        )}
      </div>
    </>
  );
}
