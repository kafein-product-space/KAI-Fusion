import React from "react";
import { Position } from "@xyflow/react";
import {
  Webhook,
  Trash,
  Radio,
  Play,
  Square,
  Copy,
  CheckCircle,
  AlertCircle,
  Clock,
  BarChart3,
} from "lucide-react";
import NeonHandle from "~/components/common/NeonHandle";
import {
  type WebhookTriggerData,
  type WebhookEvent,
  type WebhookStats,
} from "./types";

interface WebhookTriggerVisualProps {
  data: WebhookTriggerData;
  id: string;
  isHovered: boolean;
  isListening: boolean;
  events: WebhookEvent[];
  stats: WebhookStats | null;
  error: string | null;
  webhookEndpoint: string;
  webhookToken: string;
  isEndpointReady?: boolean;
  onOpenConfig: () => void;
  onDeleteNode: (e: React.MouseEvent) => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onCopyToClipboard: (text: string, type: string) => void;
  generateCurlCommand: () => string;
  getEdges: () => any[];
}

export default function WebhookTriggerVisual({
  data,
  id,
  isHovered,
  isListening,
  events,
  stats,
  error,
  webhookEndpoint,
  webhookToken,
  isEndpointReady = false,
  onOpenConfig,
  onDeleteNode,
  onStartListening,
  onStopListening,
  onCopyToClipboard,
  generateCurlCommand,
  getEdges,
}: WebhookTriggerVisualProps) {
  const edges = getEdges();

  const isHandleConnected = (handleId: string, isSource = false) =>
    edges.some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );

  const getStatusColor = () => {
    if (isListening) return "from-green-500 to-emerald-600";

    switch (data.validationStatus) {
      case "success":
        return "from-green-500 to-emerald-600";
      case "error":
        return "from-red-500 to-rose-600";
      case "warning":
        return "from-yellow-500 to-orange-600";
      case "pending":
        return "from-blue-500 to-cyan-600";
      default:
        return "from-slate-500 to-slate-600";
    }
  };

  const getGlowColor = () => {
    if (isListening) return "shadow-green-500/50";

    switch (data.validationStatus) {
      case "success":
        return "shadow-green-500/30";
      case "error":
        return "shadow-red-500/30";
      case "warning":
        return "shadow-yellow-500/30";
      case "pending":
        return "shadow-blue-500/30";
      default:
        return "shadow-slate-500/30";
    }
  };

  return (
    <div
      className={`relative transition-all duration-300 transform ${
        isHovered ? "scale-105" : "scale-100"
      }`}
    >
      {/* Ana node kutusu */}
      <div
        className={`relative group w-24 h-24 rounded-2xl flex flex-col items-center justify-center 
          cursor-pointer transition-all duration-300
          bg-gradient-to-br ${getStatusColor()}
          ${
            isHovered
              ? `shadow-2xl ${getGlowColor()}`
              : "shadow-lg shadow-black/50"
          }
          border border-white/20 backdrop-blur-sm
          hover:border-white/40`}
        onDoubleClick={onOpenConfig}
        title="Double click to configure"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>

        {/* Main icon */}
        <div className="relative z-10 mb-2">
          <div className="relative">
            <Webhook className="w-10 h-10 text-white drop-shadow-lg" />
            {/* Activity indicator */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center">
              {isListening ? (
                <Radio className="w-2 h-2 text-white animate-pulse" />
              ) : data.validationStatus === "success" ? (
                <CheckCircle className="w-2 h-2 text-white" />
              ) : data.validationStatus === "error" ? (
                <AlertCircle className="w-2 h-2 text-white" />
              ) : (
                <Clock className="w-2 h-2 text-white" />
              )}
            </div>
          </div>
        </div>

        {/* Node title */}
        <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
          {data?.displayName || data?.name || "Webhook"}
        </div>

        {/* Loading badge when endpoint is not ready */}
        {isListening && !isEndpointReady && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold shadow-lg animate-pulse">
              URL Loading...
            </div>
          </div>
        )}

        {/* Event counter badge */}
        {events.length > 0 && (
          <div className="absolute top-1 right-1 z-10">
            <div className="w-5 h-5 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-xs font-bold">
                {events.length}
              </span>
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

            {/* Listen button */}
            <button
              className={`absolute -bottom-3 -right-3 w-8 h-8 
                ${
                  isListening
                    ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500"
                    : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500"
                }
                text-white rounded-full border border-white/30 shadow-xl 
                transition-all duration-200 hover:scale-110 flex items-center justify-center z-20
                backdrop-blur-sm`}
              onClick={isListening ? onStopListening : onStartListening}
              title={isListening ? "Stop Listening" : "Start Listening"}
            >
              {isListening ? <Square size={14} /> : <Play size={14} />}
            </button>
          </>
        )}
      </div>

      {/* Output Handles */}
      <NeonHandle
        type="source"
        position={Position.Right}
        id="webhook_endpoint"
        isConnectable={true}
        size={10}
        color1="#8b5cf6"
        glow={isHandleConnected("webhook_endpoint", true)}
      />

      {/* URL Badge */}
      {webhookEndpoint && (
        <div className="absolute top-1 left-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-xs font-bold">URL</span>
          </div>
        </div>
      )}

      {/* Error indicator */}
      {error && (
        <div className="absolute top-1 left-1 z-10">
          <div className="w-4 h-4 bg-gradient-to-r from-red-400 to-red-500 rounded-full flex items-center justify-center shadow-lg">
            <AlertCircle className="w-2 h-2 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}
