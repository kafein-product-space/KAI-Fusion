import React, { useState, useCallback, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { useSnackbar } from "notistack";
import KafkaProducerVisual from "./KafkaProducerVisual";
import KafkaProducerConfigForm from "./KafkaProducerConfigForm";
import {
  type KafkaProducerNodeProps,
  type KafkaProducerResponse,
  type KafkaProducerStats,
  type KafkaProducerConfig,
  type KafkaTestResult,
} from "./types";
import { apiClient } from "~/lib/api-client";

export default function KafkaProducerNode({
  data,
  id,
}: KafkaProducerNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const { enqueueSnackbar } = useSnackbar();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResponse, setTestResponse] =
    useState<KafkaProducerResponse | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testStats, setTestStats] = useState<any>(null);
  const [stats, setStats] = useState<KafkaProducerStats | null>(null);
  const [configData, setConfigData] = useState<KafkaProducerConfig>({
    // Connection settings
    bootstrap_servers: data.bootstrap_servers || "localhost:9092",
    topic: data.topic || "",

    // Message settings
    message_key: data.message_key || "",
    message_format: data.message_format || "json",
    message_headers: data.message_headers || "{}",

    // Delivery settings
    acks: data.acks || "all",
    enable_idempotence: data.enable_idempotence ?? true,

    // Performance settings
    batch_size: data.batch_size || 100,
    linger_ms: data.linger_ms || 100,
    compression: data.compression || "none",

    // Security settings
    security_protocol: data.security_protocol || "PLAINTEXT",
    username: data.username || "",
    password: data.password || "",

    // Advanced settings
    retries: data.retries || 5,
    timeout_ms: data.timeout_ms || 30000,
    partitioner: data.partitioner || "default",

    // Kafka-specific producer settings
    max_in_flight_requests_per_connection:
      data.max_in_flight_requests_per_connection || 5,
    batch_size_bytes: data.batch_size_bytes || 16384,
    buffer_memory: data.buffer_memory || 33554432,
    max_request_size: data.max_request_size || 1048576,

    // Message serialization
    key_serializer: data.key_serializer || "string",
    value_serializer: data.value_serializer || "json",
    partitioner_class: data.partitioner_class || "default",

    // Advanced features
    transactional_id: data.transactional_id || "",
    delivery_timeout_ms: data.delivery_timeout_ms || 120000,

    // SSL/TLS settings
    ssl_cert_path: data.ssl_cert_path || "",
    ssl_key_path: data.ssl_key_path || "",
    ssl_ca_path: data.ssl_ca_path || "",

    // Monitoring
    logging_enabled: data.logging_enabled ?? false,
    debug_mode: data.debug_mode ?? false,
  });

  const sendTestMessage = useCallback(async () => {
    if (!configData.bootstrap_servers || !configData.topic) {
      setTestError("Bootstrap servers and topic are required for testing");
      return;
    }

    setIsTesting(true);
    setTestError(null);
    setTestResponse(null);
    setTestStats(null);

    try {
      const startTime = Date.now();

      // Prepare test message payload for backend
      const testMessage = {
        // Connection settings
        bootstrap_servers: configData.bootstrap_servers,
        topic: configData.topic,

        // Message data
        message_data: {
          test: true,
          timestamp: new Date().toISOString(),
          source: "kafka-producer-test",
          message: "Test message from KAI-Fusion Kafka Producer",
        },

        // Message settings
        message_key: configData.message_key || undefined,
        message_format: configData.message_format,
        message_headers: configData.message_headers
          ? JSON.parse(configData.message_headers)
          : {},

        // Delivery settings
        acks: configData.acks,
        enable_idempotence: configData.enable_idempotence,

        // Performance settings
        batch_size: configData.batch_size,
        linger_ms: configData.linger_ms,
        compression: configData.compression,

        // Security settings
        security_protocol: configData.security_protocol,
        username: configData.username || undefined,
        password: configData.password || undefined,

        // Advanced settings
        retries: configData.retries,
        timeout_ms: configData.timeout_ms,
        partitioner: configData.partitioner,

        // Kafka-specific settings
        max_in_flight_requests_per_connection:
          configData.max_in_flight_requests_per_connection,
        batch_size_bytes: configData.batch_size_bytes,
        buffer_memory: configData.buffer_memory,
        max_request_size: configData.max_request_size,

        // Serialization
        key_serializer: configData.key_serializer,
        value_serializer: configData.value_serializer,
        partitioner_class: configData.partitioner_class,

        // Advanced features
        transactional_id: configData.transactional_id || undefined,
        delivery_timeout_ms: configData.delivery_timeout_ms,

        // SSL/TLS
        ssl_cert_path: configData.ssl_cert_path || undefined,
        ssl_key_path: configData.ssl_key_path || undefined,
        ssl_ca_path: configData.ssl_ca_path || undefined,

        // Monitoring
        logging_enabled: configData.logging_enabled,
        debug_mode: configData.debug_mode,
      };

      // Send test message through backend API
      const response = await apiClient.post(
        `/kafka-producer/${id}/test`,
        testMessage
      );

      console.log("📥 Kafka Producer test response:", response);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Safely extract response data
      const responseData = response.data || response;
      const success =
        responseData.success !== undefined ? responseData.success : true;

      const result: KafkaProducerResponse = {
        success: success,
        message_id: responseData.message_id || `test-${Date.now()}`,
        topic: responseData.topic || configData.topic,
        partition: responseData.partition,
        offset: responseData.offset,
        timestamp: responseData.timestamp || new Date().toISOString(),
        metadata: responseData.metadata,
      };

      console.log("✅ Processed Kafka response:", result);

      // Create detailed response for fullscreen modal
      const detailedResponse = {
        publish_result: result,
        message_id: result.message_id,
        producer_stats: {
          total_messages: 1,
          successful_messages: success ? 1 : 0,
          failed_messages: success ? 0 : 1,
          average_send_time: duration,
          last_message_at: result.timestamp,
          error_rate: success ? 0 : 1,
          throughput_per_second: success ? 1000 / duration : 0,
          bytes_sent: JSON.stringify(testMessage.message_data).length,
          topic: result.topic,
          partition: result.partition,
          offset: result.offset,
        },
        success: success,
      };

      setTestResponse(detailedResponse);
      setTestStats({
        duration_ms: duration,
        message_size: JSON.stringify(testMessage.message_data).length,
        timestamp: new Date().toISOString(),
      });

      if (!result.success) {
        setTestError(
          `Kafka Producer failed: ${responseData.error || "Unknown error"}`
        );
      }
    } catch (error: any) {
      console.error("Kafka Producer test failed:", error);

      // Handle different types of errors
      let errorMessage = "Message publishing failed";
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
    } finally {
      setIsTesting(false);
    }
  }, [configData, id]);

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

  const generateKafkaCommand = useCallback(() => {
    if (!configData.bootstrap_servers || !configData.topic) return "";

    let command = `kafka-console-producer.sh --bootstrap-server ${configData.bootstrap_servers} --topic ${configData.topic}`;

    // Add properties
    const properties = [];

    if (configData.acks !== "all") {
      properties.push(`acks=${configData.acks}`);
    }

    if (configData.compression !== "none") {
      properties.push(`compression.type=${configData.compression}`);
    }

    if (configData.enable_idempotence) {
      properties.push("enable.idempotence=true");
    }

    if (configData.batch_size !== 100) {
      properties.push(`batch.size=${configData.batch_size_bytes}`);
    }

    if (configData.linger_ms !== 100) {
      properties.push(`linger.ms=${configData.linger_ms}`);
    }

    if (properties.length > 0) {
      command += ` --producer-property ${properties.join(
        " --producer-property "
      )}`;
    }

    // Add key serializer if message key is specified
    if (configData.message_key) {
      command += ` --property "parse.key=true" --property "key.separator=:"`;
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
      enqueueSnackbar("Kafka Producer node deleted", {
        variant: "info",
        autoHideDuration: 2000,
      });
    },
    [setNodes, id, enqueueSnackbar]
  );

  const validate = (values: Partial<KafkaProducerConfig>) => {
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
    if (values.retries && values.retries < 0) {
      errors.retries = "Retries must be non-negative";
    }
    if (values.batch_size && values.batch_size < 1) {
      errors.batch_size = "Batch size must be at least 1";
    }
    return errors;
  };

  const handleSaveConfig = useCallback(
    (values: Partial<KafkaProducerConfig>) => {
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
        enqueueSnackbar("Kafka Producer configuration saved successfully!", {
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

  const isHandleConnected = (handleId: string, isSource = false) => {
    // Only check for the handles that actually exist on the visual component
    const validHandles = isSource ? ["publish_result"] : ["message_data"];

    if (!validHandles.includes(handleId)) return false;

    return getEdges().some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );
  };

  if (isConfigMode) {
    return (
      <KafkaProducerConfigForm
        configData={configData}
        onSave={handleSaveConfig}
        onCancel={handleCancel}
        isTesting={isTesting}
        testResponse={testResponse}
        testError={testError}
        testStats={testStats}
        onSendTestMessage={sendTestMessage}
        onCopyToClipboard={copyToClipboard}
        generateKafkaCommand={generateKafkaCommand}
      />
    );
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <KafkaProducerVisual
        data={data}
        isSelected={false}
        isHovered={isHovered}
        onDoubleClick={() => setIsConfigMode(true)}
        onOpenConfig={handleOpenConfig}
        onDeleteNode={handleDeleteNode}
        onSendTestMessage={sendTestMessage}
        onCopyToClipboard={copyToClipboard}
        generateKafkaCommand={generateKafkaCommand}
        isTesting={isTesting}
        testResponse={testResponse}
        testError={testError}
        testStats={testStats}
        isHandleConnected={isHandleConnected}
      />
    </div>
  );
}
