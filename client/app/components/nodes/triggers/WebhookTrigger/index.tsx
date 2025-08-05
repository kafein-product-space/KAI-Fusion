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
  const [configData, setConfigData] = useState<WebhookTriggerConfig>(
    data as WebhookTriggerConfig
  );

  // Webhook endpoint URL'ini oluştur
  useEffect(() => {
    // Webhook ID yoksa node ID'yi kullan
    const webhookId = data?.webhook_id || id;
    const baseUrl = window.location.origin;
    setWebhookEndpoint(`${baseUrl}/api/webhooks/${webhookId}`);
    setWebhookToken(data?.webhook_token || "wht_secrettoken123");
  }, [data?.webhook_id, id]);

  // Real-time event streaming
  useEffect(() => {
    if (!isListening) return;

    const webhookId = data?.webhook_id || id;
    const eventSource = new EventSource(`/api/webhooks/${webhookId}/stream`);

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
      const response = await fetch(`/api/webhooks/${webhookId}/stats`);
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
      const response = await fetch(
        `/api/webhooks/${webhookId}/start-listening`,
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
      // Backend'e listening durdurma isteği gönder
      await fetch(`/api/webhooks/${webhookId}/stop-listening`, {
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
    if (!values.webhook_token || values.webhook_token.trim() === "") {
      errors.webhook_token = "Webhook token is required";
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
