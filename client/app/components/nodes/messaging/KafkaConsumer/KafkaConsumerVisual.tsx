import React from "react";
import { Position } from "@xyflow/react";
import {
  Download,
  Trash,
  CheckCircle,
  Settings,
  Play,
  Copy,
  Zap,
  MessageSquare,
  Database,
  AlertTriangle,
  Users,
  Activity,
  Pause,
} from "lucide-react";
import NeonHandle from "~/components/common/NeonHandle";
import type { KafkaConsumerData } from "./types";

interface KafkaConsumerVisualProps {
  data: KafkaConsumerData;
  isSelected?: boolean;
  isHovered?: boolean;
  onDoubleClick?: (e: React.MouseEvent) => void;
  onOpenConfig?: () => void;
  onDeleteNode?: (e: React.MouseEvent) => void;
  onStartConsumer?: () => void;
  onStopConsumer?: () => void;
  onTestConsumer?: () => void;
  onCopyToClipboard?: (text: string, type: string) => void;
  generateKafkaCommand?: () => string;
  isConsuming?: boolean;
  isTesting?: boolean;
  testResponse?: any;
  testError?: string | null;
  testStats?: any;
  isHandleConnected?: (handleId: string, isSource?: boolean) => boolean;
}

export default function KafkaConsumerVisual({
  data,
  isSelected = false,
  isHovered = false,
  onDoubleClick,
  onOpenConfig,
  onDeleteNode,
  onStartConsumer,
  onStopConsumer,
  onTestConsumer,
  onCopyToClipboard,
  generateKafkaCommand,
  isConsuming = false,
  isTesting = false,
  testResponse,
  testError,
  testStats,
  isHandleConnected: isHandleConnectedProp,
}: KafkaConsumerVisualProps) {
  const getStatusColor = () => {
    if (isConsuming) return "from-green-500 to-emerald-600";
    if (isTesting) return "from-yellow-500 to-orange-600";
    if (testResponse?.success) return "from-blue-500 to-cyan-600";
    if (testError) return "from-red-500 to-rose-600";

    switch (data.validationStatus) {
      case "success":
        return "from-blue-500 to-cyan-600";
      case "error":
        return "from-red-500 to-rose-600";
      default:
        return "from-indigo-500 to-purple-600";
    }
  };

  const getGlowColor = () => {
    if (isConsuming) return "shadow-green-500/50";
    if (isTesting) return "shadow-yellow-500/50";
    if (testResponse?.success) return "shadow-blue-500/30";
    if (testError) return "shadow-red-500/30";

    switch (data.validationStatus) {
      case "success":
        return "shadow-blue-500/30";
      case "error":
        return "shadow-red-500/30";
      default:
        return "shadow-indigo-500/30";
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
      title="Double click to configure Kafka Consumer"
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
          {/* Consumer indicator */}
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full flex items-center justify-center">
            {isConsuming ? (
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            ) : isTesting ? (
              <div className="w-2 h-2 bg-white rounded-full animate-spin"></div>
            ) : testResponse ? (
              <CheckCircle className="w-2 h-2 text-white" />
            ) : (
              <Download className="w-2 h-2 text-white" />
            )}
          </div>
        </div>
      </div>

      {/* Node title */}
      <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
        {data?.displayName || data?.name || "Consumer"}
      </div>

      {/* Consuming status */}
      {isConsuming && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <div className="px-2 py-1 rounded bg-green-600 text-white text-xs font-bold shadow-lg animate-pulse">
            📡 CONSUMING
          </div>
        </div>
      )}

      {/* Testing status */}
      {isTesting && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <div className="px-2 py-1 rounded bg-yellow-600 text-white text-xs font-bold shadow-lg animate-pulse">
            🔍 TESTING
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
                bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500
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

          {/* Start/Stop consumer button */}
          {onStartConsumer && onStopConsumer && (
            <button
              className="absolute -bottom-3 -right-3 w-8 h-8 
                bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500
                text-white rounded-full border border-white/30 shadow-xl 
                transition-all duration-200 hover:scale-110 flex items-center justify-center z-20
                backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                if (isConsuming) {
                  onStopConsumer();
                } else {
                  onStartConsumer();
                }
              }}
              title={isConsuming ? "Stop Consumer" : "Start Consumer"}
            >
              {isConsuming ? <Pause size={14} /> : <Play size={14} />}
            </button>
          )}

          {/* Test consumer button */}
          {onTestConsumer && (
            <button
              className="absolute -top-3 -left-3 w-8 h-8 
                bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500
                text-white rounded-full border border-white/30 shadow-xl 
                transition-all duration-200 hover:scale-110 flex items-center justify-center z-20
                backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                onTestConsumer();
              }}
              title="Test Consumer"
              disabled={isTesting || isConsuming}
            >
              {isTesting ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Activity size={14} />
              )}
            </button>
          )}
        </>
      )}

      <NeonHandle
        type="source"
        position={Position.Right}
        id="messages"
        isConnectable={true}
        size={10}
        color1="#10b981"
        glow={isHandleConnected("messages", true)}
      />

      {/* Topic Badge */}
      {data?.topic && (
        <div className="absolute top-1 left-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
            <Database className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Consumer Group Badge */}
      {data?.group_id && (
        <div className="absolute top-1 right-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
            <Users className="w-2 h-2 text-white" />
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
