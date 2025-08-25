import React from "react";
import { Position } from "@xyflow/react";
import {
  ArrowUpCircle,
  Trash,
  Globe,
  CheckCircle,
  Settings,
  Send,
  Play,
  Square,
  Copy,
} from "lucide-react";
import NeonHandle from "~/components/common/NeonHandle";
import type { HTTPClientData } from "./types";

interface HTTPClientVisualProps {
  data: HTTPClientData;
  isSelected?: boolean;
  isHovered?: boolean;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onOpenConfig?: () => void;
  onDeleteNode?: (e: React.MouseEvent) => void;
  onSendTestRequest?: () => void;
  onCopyToClipboard?: (text: string, type: string) => void;
  generateCurlCommand?: () => string;
  isTesting?: boolean;
  testResponse?: any;
  testError?: string | null;
  testStats?: any;
  isHandleConnected?: (handleId: string, isSource?: boolean) => boolean;
}

export default function HTTPClientVisual({
  data,
  isSelected = false,
  isHovered = false,
  onDoubleClick,
  onOpenConfig,
  onDeleteNode,
  onSendTestRequest,
  onCopyToClipboard,
  generateCurlCommand,
  isTesting = false,
  testResponse,
  testError,
  testStats,
  isHandleConnected: isHandleConnectedProp,
}: HTTPClientVisualProps) {
  const getStatusColor = () => {
    if (isTesting) return "from-yellow-500 to-orange-600";
    if (testResponse?.success) return "from-emerald-500 to-teal-600";
    if (testError) return "from-red-500 to-rose-600";

    switch (data.validationStatus) {
      case "success":
        return "from-emerald-500 to-teal-600";
      case "error":
        return "from-red-500 to-rose-600";
      default:
        return "from-blue-500 to-purple-600";
    }
  };

  const getGlowColor = () => {
    if (isTesting) return "shadow-yellow-500/50";
    if (testResponse?.success) return "shadow-emerald-500/30";
    if (testError) return "shadow-red-500/30";

    switch (data.validationStatus) {
      case "success":
        return "shadow-emerald-500/30";
      case "error":
        return "shadow-red-500/30";
      default:
        return "shadow-blue-500/30";
    }
  };

  const isHandleConnected = (handleId: string, isSource = false) => {
    return isHandleConnectedProp
      ? isHandleConnectedProp(handleId, isSource)
      : false;
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
      title="Double click to configure"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>

      {/* Main icon */}
      <div className="relative z-10 mb-2">
        <div className="relative">
          <ArrowUpCircle className="w-10 h-10 text-white drop-shadow-lg" />
          {/* Testing indicator */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center">
            {isTesting ? (
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            ) : testResponse ? (
              <CheckCircle className="w-2 h-2 text-white" />
            ) : (
              <Globe className="w-2 h-2 text-white" />
            )}
          </div>
        </div>
      </div>

      {/* Node title */}
      <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
        {data?.displayName || data?.name || "HTTP"}
      </div>

      {/* Testing status */}
      {isTesting && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <div className="px-2 py-1 rounded bg-yellow-600 text-white text-xs font-bold shadow-lg animate-pulse">
            ⚡ TESTING
          </div>
        </div>
      )}

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
            onClick={onDeleteNode}
            title="Delete Node"
          >
            <Trash size={14} />
          </button>

          {/* Copy cURL button */}
          {generateCurlCommand && onCopyToClipboard && (
            <button
              className="absolute -bottom-3 -left-3 w-8 h-8 
                bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500
                text-white rounded-full border border-white/30 shadow-xl 
                transition-all duration-200 hover:scale-110 flex items-center justify-center z-20
                backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                onCopyToClipboard(generateCurlCommand(), "cURL");
              }}
              title="Copy cURL"
            >
              <Copy size={14} />
            </button>
          )}
        </>
      )}

      {/* Input Handle */}
      <NeonHandle
        type="target"
        position={Position.Left}
        id="execute"
        isConnectable={true}
        size={10}
        color1="#3b82f6"
        glow={isHandleConnected("execute", true)}
      />

      {/* Documents Output Handle for ChunkSplitter */}
      <NeonHandle
        type="source"
        position={Position.Right}
        id="documents"
        isConnectable={true}
        size={10}
        color1="#10b981"
        glow={isHandleConnected("documents", true)}
      />

      {/* URL Badge */}
      {data?.url && (
        <div className="absolute top-1 left-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
            <Globe className="w-2 h-2 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}
