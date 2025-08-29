import React from "react";
import { Handle, Position } from "@xyflow/react";
import {
  Activity,
  Database,
  Settings,
  Copy,
  TestTube,
  Play,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  MessageSquare,
} from "lucide-react";
import type { KafkaConsumerData, KafkaMessage, KafkaConsumerStats } from "./types";

interface KafkaConsumerVisualProps {
  data: KafkaConsumerData;
  isSelected: boolean;
  isHovered: boolean;
  isConnected: boolean;
  onDoubleClick: () => void;
  onOpenConfig: () => void;
  onDeleteNode: (e: React.MouseEvent) => void;
  onTestConnection: () => void;
  onCopyToClipboard: (text: string, type: string) => void;
  generateKafkaCliCommand: () => string;
  isTesting: boolean;
  testMessages: KafkaMessage[];
  testError: string | null;
  stats: KafkaConsumerStats | null;
  isHandleConnected: (handleId: string, isSource?: boolean) => boolean;
}

export default function KafkaConsumerVisual({
  data,
  isSelected,
  isHovered,
  isConnected,
  onDoubleClick,
  onOpenConfig,
  onDeleteNode,
  onTestConnection,
  onCopyToClipboard,
  generateKafkaCliCommand,
  isTesting,
  testMessages,
  testError,
  stats,
  isHandleConnected,
}: KafkaConsumerVisualProps) {
  const getStatusColor = () => {
    if (testError) return "border-red-500 bg-red-900/20";
    if (isConnected) return "border-green-500 bg-green-900/20";
    if (isTesting) return "border-yellow-500 bg-yellow-900/20";
    return "border-gray-600 bg-slate-900/80";
  };

  const getStatusIcon = () => {
    if (testError) return <AlertCircle className="w-4 h-4 text-red-400" />;
    if (isConnected) return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (isTesting) return <Clock className="w-4 h-4 text-yellow-400 animate-spin" />;
    return <Database className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="relative">
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className={`w-3 h-3 border-2 ${
          isHandleConnected("input") ? "bg-blue-500 border-blue-500" : "bg-gray-600 border-gray-400"
        }`}
        style={{ left: -6 }}
      />

      {/* Main Node */}
      <div
        className={`
          relative min-w-64 rounded-lg border-2 transition-all duration-200 backdrop-blur-sm
          ${getStatusColor()}
          ${isHovered ? "shadow-lg scale-105" : "shadow-md"}
          ${isSelected ? "ring-2 ring-blue-400" : ""}
        `}
        onDoubleClick={onDoubleClick}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-600/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-white font-medium text-sm">
                Kafka Consumer
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={onTestConnection}
              disabled={isTesting}
              className="p-1.5 rounded hover:bg-white/10 transition-colors disabled:opacity-50"
              title="Test Connection"
            >
              <TestTube className="w-3.5 h-3.5 text-gray-300" />
            </button>
            <button
              onClick={onOpenConfig}
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              title="Configure"
            >
              <Settings className="w-3.5 h-3.5 text-gray-300" />
            </button>
            <button
              onClick={() =>
                onCopyToClipboard(generateKafkaCliCommand(), "Kafka CLI Command")
              }
              className="p-1.5 rounded hover:bg-white/10 transition-colors"
              title="Copy CLI Command"
            >
              <Copy className="w-3.5 h-3.5 text-gray-300" />
            </button>
            <button
              onClick={onDeleteNode}
              className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
              title="Delete Node"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Configuration Info */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Bootstrap Servers:</span>
              <span className="text-white font-mono truncate max-w-32">
                {data.bootstrap_servers || "Not configured"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Topic:</span>
              <span className="text-white font-mono truncate max-w-32">
                {data.topic || "Not configured"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Group ID:</span>
              <span className="text-white font-mono truncate max-w-32">
                {data.group_id || "Auto-generated"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Format:</span>
              <span className="text-white uppercase">
                {data.message_format || "JSON"}
              </span>
            </div>
          </div>

          {/* Status Messages */}
          {testError && (
            <div className="text-xs text-red-300 bg-red-900/30 rounded p-2 border border-red-500/30">
              <div className="font-medium">Connection Error:</div>
              <div className="mt-1 break-words">{testError}</div>
            </div>
          )}

          {/* Test Results */}
          {testMessages.length > 0 && (
            <div className="text-xs">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-3 h-3 text-green-400" />
                <span className="text-green-400 font-medium">
                  {testMessages.length} Messages Consumed
                </span>
              </div>
              <div className="bg-green-900/30 rounded p-2 border border-green-500/30 max-h-24 overflow-y-auto">
                {testMessages.slice(0, 3).map((message, index) => (
                  <div key={index} className="text-green-300 mb-1 break-words">
                    <div className="font-mono text-xs">
                      {message.key ? `${message.key}: ` : ""}
                      {typeof message.value === "object"
                        ? JSON.stringify(message.value).substring(0, 50) + "..."
                        : String(message.value).substring(0, 50) + (String(message.value).length > 50 ? "..." : "")}
                    </div>
                  </div>
                ))}
                {testMessages.length > 3 && (
                  <div className="text-green-400 text-xs">
                    +{testMessages.length - 3} more messages...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Statistics */}
          {stats && (
            <div className="text-xs">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-3 h-3 text-blue-400" />
                <span className="text-blue-400 font-medium">Statistics</span>
              </div>
              <div className="space-y-1 text-gray-300">
                <div className="flex justify-between">
                  <span>Messages:</span>
                  <span>{stats.messages_received}</span>
                </div>
                <div className="flex justify-between">
                  <span>Group ID:</span>
                  <span className="font-mono truncate max-w-24">{stats.group_id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Errors:</span>
                  <span className={stats.metrics.errors > 0 ? "text-red-400" : ""}>
                    {stats.metrics.errors}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Security Indicator */}
          {data.security_protocol && data.security_protocol !== "PLAINTEXT" && (
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1 text-green-400">
                <CheckCircle className="w-3 h-3" />
                <span>Secured ({data.security_protocol})</span>
              </div>
            </div>
          )}
        </div>

        {/* Loading Overlay */}
        {isTesting && (
          <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center">
            <div className="bg-slate-800 px-3 py-2 rounded-md flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400 animate-spin" />
              <span className="text-white text-sm">Testing Connection...</span>
            </div>
          </div>
        )}
      </div>

      {/* Output Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="messages"
        className={`w-3 h-3 border-2 ${
          isHandleConnected("messages", true) ? "bg-green-500 border-green-500" : "bg-gray-600 border-gray-400"
        }`}
        style={{ right: -6, top: "30%" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="stats"
        className={`w-3 h-3 border-2 ${
          isHandleConnected("stats", true) ? "bg-blue-500 border-blue-500" : "bg-gray-600 border-gray-400"
        }`}
        style={{ right: -6, top: "70%" }}
      />
    </div>
  );
}