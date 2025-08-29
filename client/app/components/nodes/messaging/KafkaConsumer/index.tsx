import React, { useState, useCallback, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { useSnackbar } from "notistack";
import KafkaConsumerVisual from "./KafkaConsumerVisual";
import KafkaConsumerConfigForm from "./KafkaConsumerConfigForm";
import {
  type KafkaConsumerNodeProps,
  type KafkaConsumerConfig,
  type KafkaConsumerResponse,
  type KafkaMessage,
  type KafkaConsumerStats,
} from "./types";
import { apiClient } from "~/lib/api-client";

export default function KafkaConsumerNode({ data, id }: KafkaConsumerNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const { enqueueSnackbar } = useSnackbar();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [testMessages, setTestMessages] = useState<KafkaMessage[]>([]);
  const [testError, setTestError] = useState<string | null>(null);
  const [stats, setStats] = useState<KafkaConsumerStats | null>(null);
  const [configData, setConfigData] = useState<KafkaConsumerConfig>({
    bootstrap_servers: data.bootstrap_servers || "localhost:9092",
    topic: data.topic || "",
    group_id: data.group_id || "",
    message_format: data.message_format || "json",
    batch_size: data.batch_size || 100,
    auto_offset_reset: data.auto_offset_reset || "latest",
    timeout_ms: data.timeout_ms || 30000,
    max_poll_records: data.max_poll_records || 500,
    max_messages: data.max_messages || 0,
    security_protocol: data.security_protocol || "PLAINTEXT",
    username: data.username || "",
    password: data.password || "",
    message_filter: data.message_filter || "",
    transform_template: data.transform_template || "",
    enable_auto_commit: data.enable_auto_commit !== false,
  });

  const testConnection = useCallback(async () => {
    if (!configData.bootstrap_servers || !configData.topic) {
      setTestError("Bootstrap servers and topic are required for testing");
      return;
    }

    setIsTesting(true);
    setTestError(null);
    setTestMessages([]);
    setStats(null);

    try {
      const startTime = Date.now();

      // Prepare test request payload for backend
      const testRequest = {
        bootstrap_servers: configData.bootstrap_servers,
        topic: configData.topic,
        group_id: configData.group_id || `test_group_${Date.now()}`,
        message_format: configData.message_format,
        batch_size: Math.min(configData.batch_size, 10), // Limit test batch size
        auto_offset_reset: configData.auto_offset_reset,
        timeout_ms: Math.min(configData.timeout_ms, 10000), // Shorter timeout for test
        max_poll_records: Math.min(configData.max_poll_records, 50),
        security_protocol: configData.security_protocol,
        username: configData.username || undefined,
        password: configData.password || undefined,
        message_filter: configData.message_filter || undefined,
        transform_template: configData.transform_template || undefined,
        enable_auto_commit: configData.enable_auto_commit,
        max_messages: 10, // Limit test message count
      };

      // Send test request through backend API
      const response = await apiClient.post(
        `/kafka-consumer/${id}/test`,
        testRequest
      );

      console.log("📥 Kafka Consumer test response:", response);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Process response data
      const responseData = response.data as KafkaConsumerResponse;
      
      setTestMessages(responseData.messages || []);
      setStats(responseData.consumer_stats);
      setIsConnected(true);

      if (responseData.messages && responseData.messages.length > 0) {
        enqueueSnackbar(
          `Successfully consumed ${responseData.messages.length} messages`,
          { variant: "success", autoHideDuration: 3000 }
        );
      } else {
        enqueueSnackbar("Connection successful, but no messages available", {
          variant: "info",
          autoHideDuration: 3000,
        });
      }

    } catch (error: any) {
      console.error("Kafka Consumer test failed:", error);
      setIsConnected(false);

      let errorMessage = "Connection test failed";
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.status) {
        errorMessage = `HTTP ${error.response.status}: ${
          error.response.statusText || "Request failed"
        }`;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setTestError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: "error", autoHideDuration: 4000 });
    } finally {
      setIsTesting(false);
    }
  }, [configData, id, enqueueSnackbar]);

  const copyToClipboard = useCallback(
    async (text: string, type: string) => {
      try {
        await navigator.clipboard.writeText(text);
        enqueueSnackbar(`${type} copied to clipboard`, {
          variant: "success",
          autoHideDuration: 2000,
        });
      } catch (err) {
        console.error("Failed to copy:", err);
        enqueueSnackbar("Failed to copy to clipboard", {
          variant: "error",
          autoHideDuration: 2000,
        });
      }
    },
    [enqueueSnackbar]
  );

  const generateKafkaCliCommand = useCallback(() => {
    if (!configData.bootstrap_servers || !configData.topic) return "";

    let command = `kafka-console-consumer.sh --bootstrap-server ${configData.bootstrap_servers}`;
    command += ` --topic ${configData.topic}`;
    
    if (configData.group_id) {
      command += ` --group ${configData.group_id}`;
    }
    
    if (configData.auto_offset_reset === "earliest") {
      command += ` --from-beginning`;
    }
    
    if (configData.message_format === "json") {
      command += ` --formatter kafka.tools.DefaultMessageFormatter`;
      command += ` --property print.key=true --property key.separator=:`;
    }

    return command;
  }, [configData]);

  const handleOpenConfig = useCallback(() => {
    setIsConfigMode(true);
  }, []);

  const handleDeleteNode = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setNodes((nodes) => nodes.filter((node) => node.id !== id));
      enqueueSnackbar("Kafka Consumer node deleted", {
        variant: "info",
        autoHideDuration: 2000,
      });
    },
    [setNodes, id, enqueueSnackbar]
  );

  const validate = (values: Partial<KafkaConsumerConfig>) => {
    const errors: any = {};
    
    if (!values.bootstrap_servers) {
      errors.bootstrap_servers = "Bootstrap servers are required";
    }
    
    if (!values.topic) {
      errors.topic = "Topic is required";
    }
    
    if (values.timeout_ms && values.timeout_ms < 1000) {
      errors.timeout_ms = "Timeout must be at least 1000ms";
    }
    
    if (values.batch_size && values.batch_size < 1) {
      errors.batch_size = "Batch size must be at least 1";
    }
    
    if (values.max_poll_records && values.max_poll_records < 1) {
      errors.max_poll_records = "Max poll records must be at least 1";
    }

    return errors;
  };

  const handleSaveConfig = useCallback(
    (values: Partial<KafkaConsumerConfig>) => {
      try {
        // Update the node data
        setNodes((nodes: any[]) =>
          nodes.map((node: any) =>
            node.id === id
              ? { ...node, data: { ...node.data, ...values } }
              : node
          )
        );

        // Update local config data for persistence
        setConfigData((prev) => ({ ...prev, ...values }));

        // Close config mode
        setIsConfigMode(false);

        // Show success notification
        enqueueSnackbar("Kafka Consumer configuration saved successfully!", {
          variant: "success",
          autoHideDuration: 3000,
        });
      } catch (error) {
        console.error("Error saving configuration:", error);
        enqueueSnackbar("Failed to save configuration. Please try again.", {
          variant: "error",
          autoHideDuration: 4000,
        });
      }
    },
    [setNodes, id, enqueueSnackbar]
  );

  const handleCancel = useCallback(() => {
    setIsConfigMode(false);
  }, []);

  const isHandleConnected = (handleId: string, isSource = false) =>
    getEdges().some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );

  if (isConfigMode) {
    return (
      <KafkaConsumerConfigForm
        configData={configData}
        onSave={handleSaveConfig}
        onCancel={handleCancel}
        isTesting={isTesting}
        testMessages={testMessages}
        testError={testError}
        stats={stats}
        isConnected={isConnected}
        onTestConnection={testConnection}
        onCopyToClipboard={copyToClipboard}
        generateKafkaCliCommand={generateKafkaCliCommand}
      />
    );
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <KafkaConsumerVisual
        data={data}
        isSelected={false}
        isHovered={isHovered}
        isConnected={isConnected}
        onDoubleClick={() => setIsConfigMode(true)}
        onOpenConfig={handleOpenConfig}
        onDeleteNode={handleDeleteNode}
        onTestConnection={testConnection}
        onCopyToClipboard={copyToClipboard}
        generateKafkaCliCommand={generateKafkaCliCommand}
        isTesting={isTesting}
        testMessages={testMessages}
        testError={testError}
        stats={stats}
        isHandleConnected={isHandleConnected}
      />
    </div>
  );
}