import React, { useState, useCallback, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { useSnackbar } from "notistack";
import WebhookTriggerVisual from "./WebhookTriggerVisual";
import WebhookTriggerConfigForm from "./WebhookTriggerConfigForm";
import {
  type WebhookTriggerNodeProps,
  type WebhookEvent,
  type WebhookStats,
  type WebhookTriggerConfig,
} from "./types";

export default function WebhookTriggerNode({
  data,
  id,
}: WebhookTriggerNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const { enqueueSnackbar } = useSnackbar();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [webhookEndpoint, setWebhookEndpoint] = useState<string>("");
  const [webhookToken, setWebhookToken] = useState<string>("");
  const [isEndpointReady, setIsEndpointReady] = useState(false);
  const [configData, setConfigData] = useState<WebhookTriggerConfig>({
    http_method: data?.http_method || "POST",
    authentication_required: data?.authentication_required !== false,
    allowed_event_types: data?.allowed_event_types || "",
    max_payload_size: data?.max_payload_size || 1024,
    rate_limit_per_minute: data?.rate_limit_per_minute || 60,
    enable_cors: data?.enable_cors !== false,
    webhook_timeout: data?.webhook_timeout || 30,
    webhook_token: data?.webhook_token || "wht_secrettoken123",
    // New fields from guide
    auth_type: data?.auth_type || "bearer",
    allowed_ips: data?.allowed_ips || "",
    preserve_document_metadata: data?.preserve_document_metadata !== false,
    metadata_strategy: data?.metadata_strategy || "merge",
    enable_hnsw_index: data?.enable_hnsw_index !== false,
    enable_websocket_broadcast: data?.enable_websocket_broadcast || false,
    realtime_channels: data?.realtime_channels || [],
    tenant_isolation: data?.tenant_isolation || false,
    tenant_header: data?.tenant_header || "X-Tenant-ID",
    per_tenant_rate_limits: data?.per_tenant_rate_limits || {},
    service_discovery: data?.service_discovery || false,
    load_balancing: data?.load_balancing || false,
    circuit_breaker: data?.circuit_breaker || false,
    event_routing: data?.event_routing || {},
    max_concurrent_connections: data?.max_concurrent_connections || 100,
    connection_timeout: data?.connection_timeout || 30,
    keep_alive: data?.keep_alive !== false,
    request_pooling: data?.request_pooling || false,
    enable_response_cache: data?.enable_response_cache || false,
    cache_duration: data?.cache_duration || 300,
    cache_keys: data?.cache_keys || ["event_type", "source"],
    cache_size_limit: data?.cache_size_limit || "100MB",
  });

  // Initialize webhook and get proper webhook ID from backend
  useEffect(() => {
    const initializeWebhook = async () => {
      try {
        let webhookId = data?.webhook_id;

        if (!webhookId) {
          // If no webhook ID exists, create a new one in proper format
          // Use crypto.randomUUID if available, otherwise fallback to node ID conversion
          if (typeof crypto !== "undefined" && crypto.randomUUID) {
            webhookId = `wh_${crypto
              .randomUUID()
              .replace(/-/g, "")
              .substring(0, 12)}`;
          } else {
            webhookId = `wh_${id
              .replace(/[^a-zA-Z0-9]/g, "")
              .toLowerCase()}${Date.now().toString().slice(-4)}`;
          }

          // Update node data with the generated webhook ID
          setNodes((nodes) =>
            nodes.map((node) =>
              node.id === id
                ? { ...node, data: { ...node.data, webhook_id: webhookId } }
                : node
            )
          );
        }

        // Doğrudan backend URL'ini kullan (proxy sorununu önlemek için)
        const backendUrl =
          process.env.NODE_ENV === "development"
            ? "http://localhost:8000"
            : window.location.origin;
        const endpoint = `${backendUrl}/api/v1/webhooks/${webhookId}`;
        setWebhookEndpoint(endpoint);
        setWebhookToken(data?.webhook_token || "wht_secrettoken123");
        setIsEndpointReady(true);
      } catch (error) {
        console.error("Error initializing webhook:", error);
        setError("Failed to initialize webhook endpoint");
      }
    };

    initializeWebhook();
  }, [data?.webhook_id, id, setNodes]);

  // Real-time event streaming
  useEffect(() => {
    if (!isListening) return;

    const webhookId = data?.webhook_id || id;
    const backendUrl =
      process.env.NODE_ENV === "development"
        ? "http://localhost:8000"
        : window.location.origin;
    const eventSource = new EventSource(
      `${backendUrl}/api/v1/webhooks/${webhookId}/stream`
    );

    eventSource.onmessage = (event) => {
      try {
        const webhookEvent = JSON.parse(event.data);
        setEvents((prev) => [webhookEvent, ...prev].slice(0, 10)); // Son 10 event
        setError(null);
      } catch (err) {
        setError("Invalid event data received");
      }
    };

    eventSource.onerror = (error) => {
      setError("Connection lost. Retrying...");
      // Auto-reconnect logic
      setTimeout(() => {
        if (isListening) {
          // Reconnect logic
        }
      }, 5000);
    };

    return () => eventSource.close();
  }, [isListening, data?.webhook_id, id]);

  // Stats güncelleme
  useEffect(() => {
    const webhookId = data?.webhook_id || id;
    if (webhookId) {
      fetchStats();
    }
  }, [data?.webhook_id, id]);

  const fetchStats = async () => {
    const webhookId = data?.webhook_id || id;
    if (!webhookId) return;

    try {
      const backendUrl =
        process.env.NODE_ENV === "development"
          ? "http://localhost:8000"
          : window.location.origin;
      const response = await fetch(
        `${backendUrl}/api/v1/webhooks/${webhookId}/stats`
      );
      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error("Failed to fetch webhook stats:", err);
    }
  };

  const startListening = async () => {
    const webhookId = data?.webhook_id || id;

    setIsListening(true);
    setError(null);
    setEvents([]);

    try {
      // Backend'e listening başlatma isteği gönder
      const backendUrl =
        process.env.NODE_ENV === "development"
          ? "http://localhost:8000"
          : window.location.origin;
      const response = await fetch(
        `${backendUrl}/api/v1/webhooks/${webhookId}/start-listening`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to start listening");
      }

      enqueueSnackbar("Started listening for webhook events", {
        variant: "success",
        autoHideDuration: 2000,
      });
    } catch (err) {
      setError("Failed to start listening");
      setIsListening(false);
      enqueueSnackbar("Failed to start listening", { variant: "error" });
    }
  };

  const stopListening = async () => {
    setIsListening(false);

    try {
      const webhookId = data?.webhook_id || id;
      const backendUrl =
        process.env.NODE_ENV === "development"
          ? "http://localhost:8000"
          : window.location.origin;
      // Backend'e listening durdurma isteği gönder
      await fetch(`${backendUrl}/api/v1/webhooks/${webhookId}/stop-listening`, {
        method: "POST",
      });
    } catch (err) {
      console.error("Failed to stop listening:", err);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log(`${type} copied to clipboard`);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const generateCurlCommand = () => {
    if (!webhookEndpoint || !webhookToken) return "";

    return `curl -X POST "${webhookEndpoint}" \\
    -H "Authorization: Bearer ${webhookToken}" \\
    -H "Content-Type: application/json" \\
    -d '{"event_type": "test", "data": {"message": "Hello from cURL!"}}'`;
  };

  const handleSaveConfig = useCallback(
    (values: Partial<WebhookTriggerConfig>) => {
      console.log("handleSaveConfig called with values:", values);
      try {
        // Update the node data
        setNodes((nodes) =>
          nodes.map((node) =>
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
        enqueueSnackbar("Webhook Trigger configuration saved successfully!", {
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
    enqueueSnackbar("Configuration cancelled", {
      variant: "info",
      autoHideDuration: 2000,
    });
  }, [enqueueSnackbar]);

  const handleOpenConfig = () => {
    setIsConfigMode(true);
  };

  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  // Enhanced validation function
  const validate = (values: Partial<WebhookTriggerConfig>) => {
    console.log("Validating values:", values);
    const errors: any = {};

    // Required validations
    if (
      !values.allowed_event_types ||
      values.allowed_event_types.trim() === ""
    ) {
      errors.allowed_event_types = "Allowed event types is required";
    }

    if (!values.max_payload_size || values.max_payload_size < 1) {
      errors.max_payload_size = "Max payload size must be at least 1 KB";
    }

    if (!values.rate_limit_per_minute || values.rate_limit_per_minute < 0) {
      errors.rate_limit_per_minute = "Rate limit must be at least 0";
    }

    if (
      !values.webhook_timeout ||
      values.webhook_timeout < 5 ||
      values.webhook_timeout > 300
    ) {
      errors.webhook_timeout =
        "Webhook timeout must be between 5 and 300 seconds";
    }

    // New validations for advanced features
    if (
      values.max_concurrent_connections &&
      (values.max_concurrent_connections < 1 ||
        values.max_concurrent_connections > 1000)
    ) {
      errors.max_concurrent_connections =
        "Max concurrent connections must be between 1 and 1000";
    }

    if (
      values.connection_timeout &&
      (values.connection_timeout < 5 || values.connection_timeout > 300)
    ) {
      errors.connection_timeout =
        "Connection timeout must be between 5 and 300 seconds";
    }

    if (
      values.cache_duration &&
      (values.cache_duration < 60 || values.cache_duration > 3600)
    ) {
      errors.cache_duration =
        "Cache duration must be between 60 and 3600 seconds";
    }

    return errors;
  };

  const edges = getEdges();
  const isHandleConnected = (handleId: string, isSource = false) =>
    edges.some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );

  return (
    <>
      {isConfigMode ? (
        <WebhookTriggerConfigForm
          initialValues={configData}
          validate={validate}
          onSubmit={handleSaveConfig}
          onCancel={handleCancel}
          webhookEndpoint={webhookEndpoint}
          webhookToken={webhookToken}
          events={events}
          stats={stats}
          isListening={isListening}
          onTestEvent={startListening}
          onStopListening={stopListening}
          onCopyToClipboard={copyToClipboard}
        />
      ) : (
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <WebhookTriggerVisual
            data={data}
            id={id}
            isHovered={isHovered}
            isListening={isListening}
            events={events}
            stats={stats}
            error={error}
            webhookEndpoint={webhookEndpoint}
            webhookToken={webhookToken}
            isEndpointReady={isEndpointReady}
            onOpenConfig={handleOpenConfig}
            onDeleteNode={handleDeleteNode}
            onStartListening={startListening}
            onStopListening={stopListening}
            onCopyToClipboard={copyToClipboard}
            generateCurlCommand={generateCurlCommand}
            getEdges={getEdges}
          />
        </div>
      )}
    </>
  );
}
