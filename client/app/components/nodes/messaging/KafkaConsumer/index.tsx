import React, { useState, useCallback, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { useSnackbar } from "notistack";
import KafkaConsumerVisual from "./KafkaConsumerVisual";
import KafkaConsumerConfigForm from "./KafkaConsumerConfigForm";
import {
  type KafkaConsumerNodeProps,
  type KafkaConsumerResponse,
  type KafkaConsumerStats,
  type KafkaConsumerConfig,
  type KafkaTestResult,
} from "./types";
import { apiClient } from "~/lib/api-client";

export default function KafkaConsumerNode({
  data,
  id,
}: KafkaConsumerNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const { enqueueSnackbar } = useSnackbar();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [isConsuming, setIsConsuming] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResponse, setTestResponse] =
    useState<KafkaConsumerResponse | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testStats, setTestStats] = useState<any>(null);
  const [stats, setStats] = useState<KafkaConsumerStats | null>(null);
  const [configData, setConfigData] = useState<KafkaConsumerConfig>({
    // Connection settings
    bootstrap_servers: data.bootstrap_servers || "localhost:9092",
    topic: data.topic || "",

    // Consumer group settings
    group_id: data.group_id || "",
    auto_offset_reset: data.auto_offset_reset || "latest",

    // Message processing
    message_format: data.message_format || "json",
    batch_size: data.batch_size || 100,

    // Performance settings
    timeout_ms: data.timeout_ms || 30000,
    max_poll_records: data.max_poll_records || 500,

    // Security settings
    security_protocol: data.security_protocol || "PLAINTEXT",
    username: data.username || "",
    password: data.password || "",

    // Advanced features
    message_filter: data.message_filter || "",
    transform_template: data.transform_template || "",
    enable_auto_commit: data.enable_auto_commit ?? true,
    max_messages: data.max_messages || 0,

    // Kafka-specific consumer settings
    auto_commit_interval_ms: data.auto_commit_interval_ms || 5000,
    session_timeout_ms: data.session_timeout_ms || 30000,
    heartbeat_interval_ms: data.heartbeat_interval_ms || 3000,
    max_poll_interval_ms: data.max_poll_interval_ms || 300000,
    fetch_min_bytes: data.fetch_min_bytes || 1,
    fetch_max_wait_ms: data.fetch_max_wait_ms || 500,

    // SSL/TLS settings
    ssl_cert_path: data.ssl_cert_path || "",
    ssl_key_path: data.ssl_key_path || "",
    ssl_ca_path: data.ssl_ca_path || "",

    // Monitoring
    logging_enabled: data.logging_enabled ?? false,
    debug_mode: data.debug_mode ?? false,
  });

  const testConsumer = useCallback(async () => {
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

      // Prepare test consumer payload for backend
      const testConsumerRequest = {
        // Connection settings
        bootstrap_servers: configData.bootstrap_servers,
        topic: configData.topic,

        // Consumer group settings
        group_id: configData.group_id || undefined,
        auto_offset_reset: configData.auto_offset_reset,

        // Message processing
        message_format: configData.message_format,
        batch_size: Math.min(configData.batch_size, 10), // Limit for testing

        // Performance settings
        timeout_ms: Math.min(configData.timeout_ms, 10000), // Shorter timeout for testing
        max_poll_records: Math.min(configData.max_poll_records, 10),

        // Security settings
        security_protocol: configData.security_protocol,
        username: configData.username || undefined,
        password: configData.password || undefined,

        // Advanced features
        message_filter: configData.message_filter || undefined,
        transform_template: configData.transform_template || undefined,
        enable_auto_commit: configData.enable_auto_commit,
        max_messages: 10, // Limit for testing

        // Kafka-specific settings
        auto_commit_interval_ms: configData.auto_commit_interval_ms,
        session_timeout_ms: configData.session_timeout_ms,
        heartbeat_interval_ms: configData.heartbeat_interval_ms,
        max_poll_interval_ms: configData.max_poll_interval_ms,
        fetch_min_bytes: configData.fetch_min_bytes,
        fetch_max_wait_ms: configData.fetch_max_wait_ms,

        // SSL/TLS
        ssl_cert_path: configData.ssl_cert_path || undefined,
        ssl_key_path: configData.ssl_key_path || undefined,
        ssl_ca_path: configData.ssl_ca_path || undefined,

        // Monitoring
        logging_enabled: configData.logging_enabled,
        debug_mode: configData.debug_mode,
      };

      // Send test request through backend API
      const response = await apiClient.post(
        `/kafka-consumer/${id}/test`,
        testConsumerRequest
      );

      console.log("📥 Kafka Consumer test response:", response);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Safely extract response data
      const responseData = response.data || response;
      const success =
        responseData.success !== undefined ? responseData.success : true;

      const messages = responseData.messages || [];
      const consumerStats = responseData.consumer_stats || {
        consumer_id: `test-${Date.now()}`,
        topic: configData.topic,
        group_id: configData.group_id || "test-group",
        messages_received: messages.length,
        last_poll_time: new Date().toISOString(),
        configuration: {
          bootstrap_servers: configData.bootstrap_servers,
          auto_offset_reset: configData.auto_offset_reset,
          batch_size: configData.batch_size,
          security_protocol: configData.security_protocol,
        },
        metrics: {
          total_messages: messages.length,
          successful_messages: messages.length,
          failed_messages: 0,
          average_processing_time: duration,
          last_message_at:
            messages.length > 0 ? new Date().toISOString() : null,
          error_rate: 0,
        },
      };

      const result: KafkaConsumerResponse = {
        success: success,
        messages: messages,
        consumer_stats: consumerStats,
        last_message:
          responseData.last_message ||
          (messages.length > 0 ? messages[messages.length - 1] : undefined),
      };

      console.log("✅ Processed Kafka Consumer response:", result);

      // Create detailed response for fullscreen modal
      const detailedResponse = {
        messages: messages,
        message_stream: {
          type: "async_generator",
          description: "Real-time message stream from Kafka topic",
          active: isConsuming,
          topic: configData.topic,
          group_id: configData.group_id,
        },
        consumer_stats: consumerStats,
        last_message: result.last_message,
        consumer_config: {
          bootstrap_servers: configData.bootstrap_servers,
          topic: configData.topic,
          group_id: configData.group_id,
          auto_offset_reset: configData.auto_offset_reset,
          message_format: configData.message_format,
          batch_size: configData.batch_size,
          timeout_ms: configData.timeout_ms,
          max_poll_records: configData.max_poll_records,
          security_protocol: configData.security_protocol,
          enable_auto_commit: configData.enable_auto_commit,
          message_filter: configData.message_filter,
          transform_template: configData.transform_template,
        },
      };

      setTestResponse(detailedResponse);
      setTestStats({
        duration_ms: duration,
        messages_count: messages.length,
        timestamp: new Date().toISOString(),
      });

      if (!result.success) {
        setTestError(
          `Kafka Consumer failed: ${responseData.error || "Unknown error"}`
        );
      }
    } catch (error: any) {
      console.error("Kafka Consumer test failed:", error);

      // Handle different types of errors
      let errorMessage = "Consumer test failed";
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

  const startConsumer = useCallback(async () => {
    if (!configData.bootstrap_servers || !configData.topic) {
      enqueueSnackbar("Bootstrap servers and topic are required", {
        variant: "error",
        autoHideDuration: 3000,
      });
      return;
    }

    try {
      setIsConsuming(true);

      // Start consumer through backend API
      const response = await apiClient.post(`/kafka-consumer/${id}/start`, {
        bootstrap_servers: configData.bootstrap_servers,
        topic: configData.topic,
        group_id: configData.group_id,
        auto_offset_reset: configData.auto_offset_reset,
        message_format: configData.message_format,
        batch_size: configData.batch_size,
        timeout_ms: configData.timeout_ms,
        max_poll_records: configData.max_poll_records,
        security_protocol: configData.security_protocol,
        username: configData.username,
        password: configData.password,
        message_filter: configData.message_filter,
        transform_template: configData.transform_template,
        enable_auto_commit: configData.enable_auto_commit,
        max_messages: configData.max_messages,
      });

      enqueueSnackbar("Kafka Consumer started successfully", {
        variant: "success",
        autoHideDuration: 3000,
      });
    } catch (error: any) {
      console.error("Failed to start consumer:", error);
      setIsConsuming(false);

      enqueueSnackbar(`Failed to start consumer: ${error.message}`, {
        variant: "error",
        autoHideDuration: 4000,
      });
    }
  }, [configData, id, enqueueSnackbar]);

  const stopConsumer = useCallback(async () => {
    try {
      // Stop consumer through backend API
      await apiClient.post(`/kafka-consumer/${id}/stop`);

      setIsConsuming(false);
      enqueueSnackbar("Kafka Consumer stopped", {
        variant: "info",
        autoHideDuration: 2000,
      });
    } catch (error: any) {
      console.error("Failed to stop consumer:", error);

      enqueueSnackbar(`Failed to stop consumer: ${error.message}`, {
        variant: "error",
        autoHideDuration: 4000,
      });
    }
  }, [id, enqueueSnackbar]);

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

    let command = `kafka-console-consumer.sh --bootstrap-server ${configData.bootstrap_servers} --topic ${configData.topic}`;

    // Add consumer group
    if (configData.group_id) {
      command += ` --group ${configData.group_id}`;
    }

    // Add offset reset policy
    if (configData.auto_offset_reset === "earliest") {
      command += ` --from-beginning`;
    }

    // Add properties
    const properties = [];

    if (configData.max_poll_records !== 500) {
      properties.push(`max.poll.records=${configData.max_poll_records}`);
    }

    if (!configData.enable_auto_commit) {
      properties.push("enable.auto.commit=false");
    }

    if (configData.session_timeout_ms !== 30000) {
      properties.push(`session.timeout.ms=${configData.session_timeout_ms}`);
    }

    if (properties.length > 0) {
      command += ` --consumer-property ${properties.join(
        " --consumer-property "
      )}`;
    }

    // Add key and value deserializers
    command += ` --property print.key=true --property key.separator=:`;

    return command;
  }, [configData]);

  const handleOpenConfig = useCallback(() => {
    setIsConfigMode(true);
  }, []);

  const handleDeleteNode = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Stop consumer if running
      if (isConsuming) {
        stopConsumer();
      }

      setNodes((nodes) => nodes.filter((node) => node.id !== id));
      enqueueSnackbar("Kafka Consumer node deleted", {
        variant: "info",
        autoHideDuration: 2000,
      });
    },
    [setNodes, id, enqueueSnackbar, isConsuming, stopConsumer]
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

  const isHandleConnected = (handleId: string, isSource = false) => {
    // Only check for the handles that actually exist on the visual component
    const validHandles = isSource ? ["messages", "message_stream"] : []; // Consumer has no input handles

    if (!validHandles.includes(handleId)) return false;

    return getEdges().some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConsuming) {
        stopConsumer();
      }
    };
  }, [isConsuming, stopConsumer]);

  if (isConfigMode) {
    return (
      <KafkaConsumerConfigForm
        configData={configData}
        onSave={handleSaveConfig}
        onCancel={handleCancel}
        isConsuming={isConsuming}
        isTesting={isTesting}
        testResponse={testResponse}
        testError={testError}
        testStats={testStats}
        onStartConsumer={startConsumer}
        onStopConsumer={stopConsumer}
        onTestConsumer={testConsumer}
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
      <KafkaConsumerVisual
        data={data}
        isSelected={false}
        isHovered={isHovered}
        onDoubleClick={() => setIsConfigMode(true)}
        onOpenConfig={handleOpenConfig}
        onDeleteNode={handleDeleteNode}
        onStartConsumer={startConsumer}
        onStopConsumer={stopConsumer}
        onTestConsumer={testConsumer}
        onCopyToClipboard={copyToClipboard}
        generateKafkaCommand={generateKafkaCommand}
        isConsuming={isConsuming}
        isTesting={isTesting}
        testResponse={testResponse}
        testError={testError}
        testStats={testStats}
        isHandleConnected={isHandleConnected}
      />
    </div>
  );
}
