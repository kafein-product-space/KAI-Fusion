import React, { useRef, useState } from "react";
import { useReactFlow, Position } from "@xyflow/react";
import {
  Webhook,
  Trash,
  Zap,
  Activity,
  Server,
  Globe,
  Shield,
} from "lucide-react";
import WebhookTriggerConfigModal from "~/components/modals/triggers/WebhookTriggerConfigModal";
import NeonHandle from "~/components/common/NeonHandle";

interface WebhookTriggerNodeProps {
  data: any;
  id: string;
}

function WebhookTriggerNode({ data, id }: WebhookTriggerNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const modalRef = useRef<HTMLDialogElement>(null);

  const handleOpenModal = () => {
    modalRef.current?.showModal();
  };

  const handleConfigSave = (newConfig: any) => {
    setNodes((nodes: any[]) =>
      nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, ...newConfig } }
          : node
      )
    );
  };

  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  const edges = getEdges ? getEdges() : [];
  const isHandleConnected = (handleId: string, isSource = false) =>
    edges.some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );

  const getStatusColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "from-emerald-500 to-green-600";
      case "error":
        return "from-red-500 to-rose-600";
      default:
        return "from-blue-500 to-cyan-600";
    }
  };

  const getGlowColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "shadow-emerald-500/30";
      case "error":
        return "shadow-red-500/30";
      default:
        return "shadow-blue-500/30";
    }
  };

  return (
    <>
      {/* Ana node kutusu */}
      <div
        className={`relative group w-24 h-24 rounded-2xl flex flex-col items-center justify-center 
          cursor-pointer transition-all duration-300 transform
          ${isHovered ? "scale-105" : "scale-100"}
          bg-gradient-to-br ${getStatusColor()}
          ${
            isHovered
              ? `shadow-2xl ${getGlowColor()}`
              : "shadow-lg shadow-black/50"
          }
          border border-white/20 backdrop-blur-sm
          hover:border-white/40`}
        onDoubleClick={handleOpenModal}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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
              <Activity className="w-2 h-2 text-white" />
            </div>
          </div>
        </div>

        {/* Node title */}
        <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
          {data?.displayName || data?.name || "Webhook"}
        </div>

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
              onClick={handleDeleteNode}
              title="Delete Node"
            >
              <Trash size={14} />
            </button>
          </>
        )}

        {/* Output Handles */}
        <NeonHandle
          type="source"
          position={Position.Right}
          id="webhook_endpoint"
          isConnectable={true}
          size={10}
          color1="#3b82f6"
          glow={isHandleConnected("webhook_endpoint", true)}
          style={{
            top: "20%",
          }}
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="webhook_token"
          isConnectable={true}
          size={10}
          color1="#8b5cf6"
          glow={isHandleConnected("webhook_token", true)}
          style={{
            top: "40%",
          }}
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="webhook_runnable"
          isConnectable={true}
          size={10}
          color1="#10b981"
          glow={isHandleConnected("webhook_runnable", true)}
          style={{
            top: "60%",
          }}
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="webhook_config"
          isConnectable={true}
          size={10}
          color1="#f59e0b"
          glow={isHandleConnected("webhook_config", true)}
          style={{
            top: "80%",
          }}
        />

        {/* Right side labels for outputs */}
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "15%" }}
        >
          Endpoint
        </div>
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "35%" }}
        >
          Token
        </div>
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "55%" }}
        >
          Runnable
        </div>
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "75%" }}
        >
          Config
        </div>

        {/* Webhook Type Badge */}
        {data?.endpoint_url && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold shadow-lg">
              Webhook
            </div>
          </div>
        )}

        {/* Connection Status Indicator */}
        {data?.authentication_required && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
            <div className="w-3 h-3 bg-blue-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}

        {/* Security Badge */}
        {data?.enable_cors && (
          <div className="absolute top-1 left-1 z-10">
            <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <Shield className="w-2 h-2 text-white" />
            </div>
          </div>
        )}

        {/* Server Status */}
        {data?.server_status === "active" && (
          <div className="absolute bottom-1 right-1 z-10">
            <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}
      </div>

      {/* Modal */}
      <WebhookTriggerConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default WebhookTriggerNode;
