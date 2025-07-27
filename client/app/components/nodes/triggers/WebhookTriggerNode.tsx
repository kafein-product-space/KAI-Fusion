import React, { useRef, useState } from "react";
import { useReactFlow, Position } from "@xyflow/react";
import { Webhook, Trash } from "lucide-react";
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

  return (
    <>
      {/* Ana node kutusu */}
      <div
        className={`w-24 h-24 rounded-xl flex items-center justify-center gap-3 px-4 py-4 border-2 text-gray-700 font-medium cursor-pointer transition-all
          ${
            data.validationStatus === "success"
              ? "border-green-500"
              : data.validationStatus === "error"
              ? "border-red-500"
              : "border-blue-400"
          }
          bg-blue-50 hover:bg-blue-100`}
        onDoubleClick={handleOpenModal}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Çift tıklayarak konfigüre edin"
      >
        <div className="rounded-2xl">
          <Webhook className="w-8 h-8 text-blue-600" />
        </div>
        {isHovered && (
          <button
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full border-2 border-white shadow-lg transition-all duration-200 hover:scale-110 flex items-center justify-center z-10"
            onClick={handleDeleteNode}
            title="Delete Node"
          >
            <Trash size={8} />
          </button>
        )}
        <div
          className="absolute text-xs text-blue-700 font-medium pointer-events-none whitespace-nowrap"
          style={{
            bottom: "-30%",
            transform: "translateY(-50%)",
          }}
        >
          {data?.displayName || data?.name || "Webhook Trigger"}
        </div>

        {/* Output Handles */}
        <NeonHandle
          type="source"
          position={Position.Right}
          id="webhook_endpoint"
          isConnectable={true}
          color1="#3b82f6"
          glow={isHandleConnected("webhook_endpoint", true)}
          className="absolute w-3 h-3 transition-all z-20"
          style={{
            right: -6,
            top: "25%",
            transform: "translateY(-50%)",
          }}
          title="Webhook Endpoint"
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="webhook_token"
          isConnectable={true}
          color1="#3b82f6"
          glow={isHandleConnected("webhook_token", true)}
          className="absolute w-3 h-3 transition-all z-20"
          style={{
            right: -6,
            top: "45%",
            transform: "translateY(-50%)",
          }}
          title="Webhook Token"
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="webhook_runnable"
          isConnectable={true}
          color1="#3b82f6"
          glow={isHandleConnected("webhook_runnable", true)}
          className="absolute w-3 h-3 transition-all z-20"
          style={{
            right: -6,
            top: "65%",
            transform: "translateY(-50%)",
          }}
          title="Webhook Runnable"
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="webhook_config"
          isConnectable={true}
          color1="#3b82f6"
          glow={isHandleConnected("webhook_config", true)}
          className="absolute w-3 h-3 transition-all z-20"
          style={{
            right: -6,
            top: "85%",
            transform: "translateY(-50%)",
          }}
          title="Webhook Config"
        />
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
