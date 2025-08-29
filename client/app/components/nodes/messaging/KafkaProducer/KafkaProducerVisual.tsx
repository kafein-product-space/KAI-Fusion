import React from "react";
import { Position } from "@xyflow/react";
import {
  Send,
  Trash,
  CheckCircle,
  Settings,
  Play,
  Copy,
  Zap,
  MessageSquare,
  Database,
  AlertTriangle,
} from "lucide-react";
import NeonHandle from "~/components/common/NeonHandle";
import type { KafkaProducerData } from "./types";

interface KafkaProducerVisualProps {
  data: KafkaProducerData;
  isSelected?: boolean;
  isHovered?: boolean;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onOpenConfig?: () => void;
  onDeleteNode?: (e: React.MouseEvent) => void;
  onSendTestMessage?: () => void;
  onCopyToClipboard?: (text: string, type: string) => void;
  generateKafkaCommand?: () => string;
  isTesting?: boolean;
  testResponse?: any;
  testError?: string | null;
  testStats?: any;
  isHandleConnected?: (handleId: string, isSource?: boolean) => boolean;
}

export default function KafkaProducerVisual({
  data,
  isSelected = false,
  isHovered = false,
  onDoubleClick,
  onOpenConfig,
  onDeleteNode,
  onSendTestMessage,
  onCopyToClipboard,
  generateKafkaCommand,
  isTesting = false,
  testResponse,
  testError,
  testStats,
  isHandleConnected: isHandleConnectedProp,
}: KafkaProducerVisualProps) {
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
        return "from-purple-500 to-indigo-600";
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
        return "shadow-purple-500/30";
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
      title="Double click to configure Kafka Producer"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>

      {/* Main icon */}
      <div className="relative z-10 mb-2">
        <div className="relative">
          <img
            src="/icons/kafka.svg"
            alt="Kafka"
            className="w-10 h-10 drop-shadow-lg"
            style={{ filter: "brightness(0) invert(1)" }}
          />
          {/* Producer indicator */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full flex items-center justify-center">
            {isTesting ? (
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            ) : testResponse ? (
              <CheckCircle className="w-2 h-2 text-white" />
            ) : (
              <Send className="w-2 h-2 text-white" />
            )}
          </div>
        </div>
      </div>

      {/* Node title */}
      <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
        {data?.displayName || data?.name || "Kafka"}
      </div>

      {/* Publishing status */}
      {isTesting && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <div className="px-2 py-1 rounded bg-yellow-600 text-white text-xs font-bold shadow-lg animate-pulse">
            📤 PUBLISHING
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

          {/* Copy Kafka command button */}
          {generateKafkaCommand && onCopyToClipboard && (
            <button
              className="absolute -bottom-3 -left-3 w-8 h-8 
                bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500
                text-white rounded-full border border-white/30 shadow-xl 
                transition-all duration-200 hover:scale-110 flex items-center justify-center z-20
                backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                onCopyToClipboard(generateKafkaCommand(), "Kafka Command");
              }}
              title="Copy Kafka Command"
            >
              <Copy size={14} />
            </button>
          )}

          {/* Test message button */}
          {onSendTestMessage && (
            <button
              className="absolute -bottom-3 -right-3 w-8 h-8 
                bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500
                text-white rounded-full border border-white/30 shadow-xl 
                transition-all duration-200 hover:scale-110 flex items-center justify-center z-20
                backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                onSendTestMessage();
              }}
              title="Send Test Message"
              disabled={isTesting}
            >
              {isTesting ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Play size={14} />
              )}
            </button>
          )}
        </>
      )}

      <NeonHandle
        type="target"
        position={Position.Left}
        id="message_data"
        isConnectable={true}
        size={10}
        color1="#8b5cf6"
        glow={isHandleConnected("message_data", false)}
      />

      <NeonHandle
        type="source"
        position={Position.Right}
        id="publish_result"
        isConnectable={true}
        size={10}
        color1="#10b981"
        glow={isHandleConnected("publish_result", true)}
      />

      {/* Topic Badge */}
      {data?.topic && (
        <div className="absolute top-1 left-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full flex items-center justify-center shadow-lg">
            <Database className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Connection Status Badge */}
      {data?.bootstrap_servers && (
        <div className="absolute bottom-1 left-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
            <Zap className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Error Badge */}
      {testError && (
        <div className="absolute bottom-1 right-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-red-400 to-red-500 rounded-full flex items-center justify-center shadow-lg">
            <AlertTriangle className="w-2 h-2 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}
