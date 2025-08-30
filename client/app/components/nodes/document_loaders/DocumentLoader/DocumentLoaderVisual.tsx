// DocumentLoaderVisual.tsx
import React from "react";
import { Position } from "@xyflow/react";
import { NeonHandle } from "~/components/common/NeonHandle";
import {
  Trash,
  Activity,
  Database,
  Clock,
  AlertCircle,
  CheckCircle,
  Key,
  Lock,
} from "lucide-react";
import type { DocumentLoaderVisualProps } from "./types";

export default function DocumentLoaderVisual({
  data,
  isHovered,
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
        return "from-blue-500 to-blue-600";
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

  const getProcessingStatus = () => {
    if (data.processing_status === "processing") return "Processing";
    if (data.processing_status === "completed") return "Completed";
    if (data.processing_status === "error") return "Error";
    if (data.processing_status === "idle") return "Idle";
    return "Ready";
  };

  const getAuthTypeIcon = () => {
    const authType = data.google_drive_auth_type || "service_account";
    return authType === "service_account" ? (
      <Key className="w-3 h-3" />
    ) : (
      <Lock className="w-3 h-3" />
    );
  };

  const getDriveLinksCount = () => {
    if (!data.drive_links) return 0;
    return data.drive_links
      .trim()
      .split("\n")
      .filter((link) => link.trim()).length;
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
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title="Click to configure"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>

      {/* Main icon */}
      <div className="relative z-10 mb-2">
        <div className="relative">
          <Database className="w-10 h-10 text-white drop-shadow-lg" />
          {/* Authentication type indicator */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center">
            {getAuthTypeIcon()}
          </div>
        </div>
      </div>

      {/* Node title */}
      <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
        {data?.displayName || data?.name || "Drive Loader"}
      </div>

      {/* Status indicators */}
      <div className="absolute top-1 left-1 flex items-center gap-1">
        {data.has_error ? (
          <AlertCircle className="w-3 h-3 text-red-400" />
        ) : data.validationStatus === "success" ? (
          <CheckCircle className="w-3 h-3 text-green-400" />
        ) : (
          <Clock className="w-3 h-3 text-yellow-400" />
        )}
      </div>

      {/* Drive links count */}
      {data.drive_links && (
        <div className="absolute bottom-1 right-1 bg-black/30 rounded-full px-1 py-0.5">
          <span className="text-white text-xs font-bold">
            {getDriveLinksCount()}
          </span>
        </div>
      )}

      {/* Processing status */}
      {data.processing_status && (
        <div className="absolute top-1 right-1">
          <div className="bg-black/30 rounded-full px-1 py-0.5">
            <Activity className="w-3 h-3 text-white" />
          </div>
        </div>
      )}

      {/* Document count */}
      {data.document_count && (
        <div className="absolute bottom-1 left-1 bg-black/30 rounded-full px-1 py-0.5">
          <span className="text-white text-xs font-bold">
            {data.document_count}
          </span>
        </div>
      )}

      {/* Delete button */}
      <button
        onClick={onDelete}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
        title="Delete node"
      >
        <Trash className="w-3 h-3" />
      </button>

      {/* Connection handles */}

      <NeonHandle
        type="source"
        position={Position.Right}
        id="output"
        isConnectable={true}
        size={10}
        color1="#00FFFF"
        glow={isHandleConnected("output", true)}
      />

      {/* Input handle for receiving from StartNode */}
      <NeonHandle
        type="target"
        position={Position.Left}
        id="input"
        isConnectable={true}
        size={10}
        color1="#3b82f6"
        glow={isHandleConnected("input", false)}
      />
    </div>
  );
}
