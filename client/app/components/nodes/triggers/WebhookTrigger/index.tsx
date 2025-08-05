import React, { useRef, useState, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import WebhookTriggerVisual from "./WebhookTriggerVisual";
import WebhookTriggerConfigModal from "~/components/modals/triggers/WebhookTrigger/WebhookTriggerConfigModal";
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
  const [isHovered, setIsHovered] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [stats, setStats] = useState<WebhookStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [webhookEndpoint, setWebhookEndpoint] = useState<string>("");
  const [webhookToken, setWebhookToken] = useState<string>("");
  const modalRef = useRef<HTMLDialogElement>(null);

  // Webhook endpoint URL'ini oluştur
  useEffect(() => {
    if (data?.webhook_id) {
      const baseUrl = window.location.origin;
      setWebhookEndpoint(`${baseUrl}/api/webhooks/${data.webhook_id}`);
      setWebhookToken(data.webhook_token || "wht_secrettoken123");
    }
  }, [data?.webhook_id]);

  // Real-time event streaming
  useEffect(() => {
    if (!isListening || !data?.webhook_id) return;

    const eventSource = new EventSource(
      `/api/webhooks/${data.webhook_id}/stream`
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
  }, [isListening, data?.webhook_id]);

  // Stats güncelleme
  useEffect(() => {
    if (data?.webhook_id) {
      fetchStats();
    }
  }, [data?.webhook_id]);

  const fetchStats = async () => {
    if (!data?.webhook_id) return;

    try {
      const response = await fetch(`/api/webhooks/${data.webhook_id}/stats`);
      if (response.ok) {
        const statsData = await response.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error("Failed to fetch webhook stats:", err);
    }
  };

  const startListening = async () => {
    if (!data?.webhook_id) return;

    setIsListening(true);
    setError(null);
    setEvents([]);

    try {
      // Backend'e listening başlatma isteği gönder
      const response = await fetch(
        `/api/webhooks/${data.webhook_id}/start-listening`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to start listening");
      }
    } catch (err) {
      setError("Failed to start listening");
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    setIsListening(false);

    try {
      // Backend'e listening durdurma isteği gönder
      await fetch(`/api/webhooks/${data.webhook_id}/stop-listening`, {
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

  const handleOpenModal = () => {
    modalRef.current?.showModal();
  };

  const handleConfigSave = (newConfig: WebhookTriggerConfig) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                ...newConfig,
              },
            }
          : node
      )
    );
  };

  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  return (
    <>
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
          onOpenModal={handleOpenModal}
          onDeleteNode={handleDeleteNode}
          onStartListening={startListening}
          onStopListening={stopListening}
          onCopyToClipboard={copyToClipboard}
          generateCurlCommand={generateCurlCommand}
          getEdges={getEdges}
        />
      </div>

      <WebhookTriggerConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
        isListening={isListening}
        events={events}
        stats={stats}
        webhookEndpoint={webhookEndpoint}
        webhookToken={webhookToken}
        onStartListening={startListening}
        onStopListening={stopListening}
        onCopyToClipboard={copyToClipboard}
        generateCurlCommand={generateCurlCommand}
      />
    </>
  );
}
