import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Handle, Position } from "reactflow";
import { Settings, AlertTriangle, CheckCircle, Send, Database } from "lucide-react";
import type { 
  KafkaProducerData, 
  KafkaProducerConfig, 
  KafkaMessage,
  KafkaProducerStats,
  KafkaProducerTestResult,
  PerformancePreset 
} from "./types";
import { DEFAULT_KAFKA_PRODUCER_CONFIG, PERFORMANCE_PRESETS } from "./types";
import KafkaProducerVisual from "./KafkaProducerVisual";
import KafkaProducerConfigForm from "./KafkaProducerConfigForm";

interface KafkaProducerProps {
  id: string;
  data: KafkaProducerData;
  selected?: boolean;
}

export default function KafkaProducer({ id, data, selected }: KafkaProducerProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [configData, setConfigData] = useState<KafkaProducerConfig>(
    data.config || DEFAULT_KAFKA_PRODUCER_CONFIG
  );
  const [testResult, setTestResult] = useState<KafkaProducerTestResult | null>(null);
  const [stats, setStats] = useState<KafkaProducerStats | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Validation state
  const isValid = useMemo(() => {
    return !!(configData.bootstrap_servers && configData.topic);
  }, [configData.bootstrap_servers, configData.topic]);

  // Connection status based on validation and test results
  const connectionStatus = useMemo(() => {
    if (!isValid) return "invalid";
    if (testResult?.success) return "connected";
    if (testResult?.error) return "error";
    return "disconnected";
  }, [isValid, testResult]);

  // Handle configuration save
  const handleConfigSave = useCallback(async (newConfig: Partial<KafkaProducerConfig>) => {
    const updatedConfig = { ...configData, ...newConfig };
    setConfigData(updatedConfig);
    
    // Update node data through React Flow
    // This would typically call a parent callback or dispatch an action
    console.log("Saving KafkaProducer config:", updatedConfig);
    
    setShowConfig(false);
    
    // Clear previous test results when config changes
    setTestResult(null);
    setStats(null);
    setIsConnected(false);
  }, [configData]);

  // Handle configuration cancel
  const handleConfigCancel = useCallback(() => {
    setShowConfig(false);
  }, []);

  // Test connection to Kafka
  const handleTestConnection = useCallback(async () => {
    if (!configData.bootstrap_servers || !configData.topic) {
      setTestResult({
        success: false,
        error: "Bootstrap servers and topic are required"
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // Simulate API call to test connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful connection
      const mockResult: KafkaProducerTestResult = {
        success: true,
        message: {
          key: "test-key",
          value: { message: "Test message", timestamp: new Date().toISOString() },
          headers: { "test": "true" }
        },
        partition: 0,
        offset: 12345,
        latency_ms: 45
      };

      // Mock statistics
      const mockStats: KafkaProducerStats = {
        messages_sent: 1,
        messages_pending: 0,
        messages_failed: 0,
        bytes_sent: 156,
        partitions: [0, 1, 2],
        client_id: configData.client_id || "kai-fusion-producer",
        topic: configData.topic,
        metrics: {
          batch_size_avg: 1,
          batch_size_max: 1,
          record_send_rate: 1.0,
          record_error_rate: 0.0,
          request_latency_avg: 45,
          request_latency_max: 45,
          outgoing_byte_rate: 156.0,
          last_activity: new Date().toISOString(),
          connection_count: 1
        }
      };

      setTestResult(mockResult);
      setStats(mockStats);
      setIsConnected(true);
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Connection failed"
      });
      setIsConnected(false);
    } finally {
      setIsTesting(false);
    }
  }, [configData.bootstrap_servers, configData.topic, configData.client_id]);

  // Send a test message
  const handleSendTestMessage = useCallback(async (message: KafkaMessage) => {
    setIsPublishing(true);
    
    try {
      // Simulate API call to send message
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful publish
      const result: KafkaProducerTestResult = {
        success: true,
        message,
        partition: Math.floor(Math.random() * 3),
        offset: Math.floor(Math.random() * 10000) + 12345,
        latency_ms: Math.floor(Math.random() * 100) + 10
      };
      
      setTestResult(result);
      
      // Update stats
      if (stats) {
        setStats({
          ...stats,
          messages_sent: stats.messages_sent + 1,
          bytes_sent: stats.bytes_sent + JSON.stringify(message).length,
          metrics: {
            ...stats.metrics,
            last_activity: new Date().toISOString(),
            record_send_rate: stats.metrics.record_send_rate + 0.1
          }
        });
      }
      
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Failed to send message"
      });
    } finally {
      setIsPublishing(false);
    }
  }, [stats]);

  // Apply performance preset
  const handleApplyPreset = useCallback((preset: PerformancePreset) => {
    const presetConfig = PERFORMANCE_PRESETS[preset];
    if (presetConfig) {
      setConfigData(current => ({
        ...current,
        ...presetConfig.config
      }));
    }
  }, []);

  // Generate Kafka CLI command for testing
  const generateKafkaCliCommand = useCallback(() => {
    const servers = configData.bootstrap_servers.split(',')[0];
    return `kafka-console-producer --bootstrap-server ${servers} --topic ${configData.topic}${
      configData.message_key_template ? ' --property "parse.key=true" --property "key.separator=:"' : ''
    }`;
  }, [configData.bootstrap_servers, configData.topic, configData.message_key_template]);

  // Copy text to clipboard
  const handleCopyToClipboard = useCallback(async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Show success notification
      console.log(`${type} copied to clipboard`);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  }, []);

  if (showConfig) {
    return (
      <div className="kafka-producer-config bg-gray-800 rounded-lg shadow-lg border border-gray-600 min-w-[600px] min-h-[500px]">
        <div className="flex items-center gap-2 p-4 border-b border-gray-600">
          <Database className="w-5 h-5 text-yellow-400" />
          <span className="text-white font-medium">Configure Kafka Producer</span>
          <span className="text-gray-400 text-sm">({configData.topic || "No topic"})</span>
        </div>
        <KafkaProducerConfigForm
          configData={configData}
          onSave={handleConfigSave}
          onCancel={handleConfigCancel}
          isTesting={isTesting}
          isPublishing={isPublishing}
          testResult={testResult}
          stats={stats}
          isConnected={isConnected}
          onTestConnection={handleTestConnection}
          onSendTestMessage={handleSendTestMessage}
          onApplyPreset={handleApplyPreset}
          onCopyToClipboard={handleCopyToClipboard}
          generateKafkaCliCommand={generateKafkaCliCommand}
        />
      </div>
    );
  }

  return (
    <div className={`kafka-producer-node ${selected ? "selected" : ""}`}>
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: "#374151",
          border: "2px solid #6B7280",
          width: "12px",
          height: "12px",
        }}
      />

      {/* Node Content */}
      <div className="relative">
        <KafkaProducerVisual
          config={configData}
          connectionStatus={connectionStatus}
          stats={stats}
          testResult={testResult}
          isPublishing={isPublishing}
          onOpenConfig={() => setShowConfig(true)}
        />
        
        {/* Status Indicator */}
        <div className="absolute -top-2 -right-2">
          {connectionStatus === "connected" && (
            <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg">
              <CheckCircle className="w-3 h-3 text-white ml-0.5 mt-0.5" />
            </div>
          )}
          {connectionStatus === "error" && (
            <div className="w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-lg">
              <AlertTriangle className="w-3 h-3 text-white ml-0.5 mt-0.5" />
            </div>
          )}
          {!isValid && (
            <div className="w-4 h-4 bg-gray-500 rounded-full border-2 border-white shadow-lg">
              <Settings className="w-3 h-3 text-white ml-0.5 mt-0.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}