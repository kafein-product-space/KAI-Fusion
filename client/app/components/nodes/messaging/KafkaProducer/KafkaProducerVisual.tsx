import React from "react";
import { 
  Settings, 
  Send, 
  Database,
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowUp,
  Zap,
  Users,
  Target
} from "lucide-react";
import type { 
  KafkaProducerConfig, 
  KafkaProducerStats,
  KafkaProducerTestResult 
} from "./types";

interface KafkaProducerVisualProps {
  config: KafkaProducerConfig;
  connectionStatus: "connected" | "disconnected" | "error" | "invalid";
  stats?: KafkaProducerStats | null;
  testResult?: KafkaProducerTestResult | null;
  isPublishing?: boolean;
  onOpenConfig: () => void;
}

// Utility functions
const formatNumber = (num: number): string => {
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  return `${(num / 1000000).toFixed(1)}M`;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatLatency = (ms: number): string => {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export default function KafkaProducerVisual({
  config,
  connectionStatus,
  stats,
  testResult,
  isPublishing = false,
  onOpenConfig
}: KafkaProducerVisualProps) {
  const getStatusColor = (status: typeof connectionStatus) => {
    switch (status) {
      case "connected": return "text-green-400 border-green-400 bg-green-400/10";
      case "error": return "text-red-400 border-red-400 bg-red-400/10";
      case "invalid": return "text-gray-400 border-gray-400 bg-gray-400/10";
      default: return "text-blue-400 border-blue-400 bg-blue-400/10";
    }
  };

  const getStatusIcon = (status: typeof connectionStatus) => {
    switch (status) {
      case "connected": return CheckCircle;
      case "error": return AlertTriangle;
      case "invalid": return Settings;
      default: return Database;
    }
  };

  const StatusIcon = getStatusIcon(connectionStatus);
  const statusColorClass = getStatusColor(connectionStatus);

  return (
    <div className="kafka-producer-visual bg-gray-800 border border-gray-600 rounded-lg shadow-lg min-w-[280px] max-w-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-600">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-yellow-400" />
          <span className="text-white text-sm font-medium">Kafka Producer</span>
        </div>
        <button
          onClick={onOpenConfig}
          className="text-gray-400 hover:text-white transition-colors p-1 rounded"
          title="Configure Producer"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Connection Status */}
      <div className="p-3 border-b border-gray-600">
        <div className={`flex items-center gap-2 p-2 rounded-lg border ${statusColorClass}`}>
          <StatusIcon className="w-4 h-4" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium capitalize">
              {connectionStatus === "invalid" ? "Not Configured" : connectionStatus}
            </div>
            <div className="text-xs opacity-80 truncate">
              {config.topic || "No topic configured"}
            </div>
          </div>
          {isPublishing && (
            <div className="animate-spin">
              <ArrowUp className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="p-3 space-y-2 text-sm">
        {/* Broker Information */}
        <div className="flex items-center gap-2">
          <Database className="w-3 h-3 text-gray-400" />
          <span className="text-gray-300 truncate">
            {config.bootstrap_servers?.split(',')[0] || "Not configured"}
          </span>
        </div>

        {/* Topic */}
        <div className="flex items-center gap-2">
          <Target className="w-3 h-3 text-gray-400" />
          <span className="text-gray-300 truncate">
            Topic: {config.topic || "None"}
          </span>
        </div>

        {/* Producer Settings */}
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-gray-400" />
          <span className="text-gray-300">
            Acks: {config.acks}, Batch: {formatBytes(config.batch_size)}
          </span>
        </div>

        {/* Security */}
        {config.security_protocol !== "PLAINTEXT" && (
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3 text-gray-400" />
            <span className="text-gray-300">
              Security: {config.security_protocol}
            </span>
          </div>
        )}
      </div>

      {/* Statistics */}
      {stats && connectionStatus === "connected" && (
        <div className="p-3 border-t border-gray-600">
          <div className="flex items-center gap-1 mb-2">
            <Activity className="w-3 h-3 text-green-400" />
            <span className="text-green-400 text-xs font-medium">Producer Statistics</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Messages Sent */}
            <div>
              <div className="text-gray-400">Messages Sent</div>
              <div className="text-white font-mono">
                {formatNumber(stats.messages_sent)}
              </div>
            </div>

            {/* Bytes Sent */}
            <div>
              <div className="text-gray-400">Data Sent</div>
              <div className="text-white font-mono">
                {formatBytes(stats.bytes_sent)}
              </div>
            </div>

            {/* Send Rate */}
            <div>
              <div className="text-gray-400">Send Rate</div>
              <div className="text-white font-mono">
                {stats.metrics.record_send_rate.toFixed(1)}/s
              </div>
            </div>

            {/* Avg Latency */}
            <div>
              <div className="text-gray-400">Avg Latency</div>
              <div className="text-white font-mono">
                {formatLatency(stats.metrics.request_latency_avg)}
              </div>
            </div>

            {/* Pending Messages */}
            {stats.messages_pending > 0 && (
              <div className="col-span-2">
                <div className="text-yellow-400">Pending Messages</div>
                <div className="text-yellow-300 font-mono">
                  {formatNumber(stats.messages_pending)}
                </div>
              </div>
            )}

            {/* Failed Messages */}
            {stats.messages_failed > 0 && (
              <div className="col-span-2">
                <div className="text-red-400">Failed Messages</div>
                <div className="text-red-300 font-mono">
                  {formatNumber(stats.messages_failed)}
                </div>
              </div>
            )}
          </div>

          {/* Partitions */}
          {stats.partitions.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <div className="text-gray-400 text-xs mb-1">Available Partitions</div>
              <div className="flex flex-wrap gap-1">
                {stats.partitions.slice(0, 8).map((partition) => (
                  <span
                    key={partition}
                    className="px-1.5 py-0.5 bg-blue-600/20 text-blue-300 rounded text-xs font-mono"
                  >
                    {partition}
                  </span>
                ))}
                {stats.partitions.length > 8 && (
                  <span className="text-gray-400 text-xs">
                    +{stats.partitions.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Test Result */}
      {testResult && (
        <div className="p-3 border-t border-gray-600">
          {testResult.success ? (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-green-400 text-xs font-medium">Message Published</span>
              </div>
              <div className="text-xs text-green-200 space-y-1">
                <div>Partition: {testResult.partition}, Offset: {testResult.offset}</div>
                {testResult.latency_ms && (
                  <div>Latency: {formatLatency(testResult.latency_ms)}</div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-2">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span className="text-red-400 text-xs font-medium">Publish Failed</span>
              </div>
              <div className="text-xs text-red-200">{testResult.error}</div>
            </div>
          )}
        </div>
      )}

      {/* Performance Indicator */}
      {connectionStatus === "connected" && (
        <div className="p-2 border-t border-gray-700">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Performance Mode</span>
            <span className="text-gray-300 capitalize">
              {config.enable_idempotence ? "Durability" :
               config.acks === "0" ? "Throughput" :
               config.linger_ms === 0 ? "Latency" : "Balanced"}
            </span>
          </div>
          
          {/* Performance bars */}
          <div className="mt-1 space-y-1">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 w-12">Speed</span>
              <div className="flex-1 h-1 bg-gray-700 rounded">
                <div 
                  className={`h-full rounded ${
                    config.linger_ms === 0 ? "bg-green-500 w-5/6" : 
                    config.linger_ms <= 5 ? "bg-yellow-500 w-3/5" : "bg-red-500 w-2/5"
                  }`} 
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 w-12">Safety</span>
              <div className="flex-1 h-1 bg-gray-700 rounded">
                <div 
                  className={`h-full rounded ${
                    config.acks === "all" || config.enable_idempotence ? "bg-green-500 w-5/6" :
                    config.acks === "1" ? "bg-yellow-500 w-3/5" : "bg-red-500 w-2/5"
                  }`} 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Last Activity */}
      {stats?.metrics.last_activity && (
        <div className="p-2 border-t border-gray-700">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            <span>Last: {new Date(stats.metrics.last_activity).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}