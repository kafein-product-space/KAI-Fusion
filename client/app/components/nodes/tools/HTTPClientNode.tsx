import React, { useRef, useState } from "react";
import { useReactFlow, Position } from "@xyflow/react";
import {
  ArrowUpCircle,
  Trash,
  Globe,
  Code,
  CheckCircle,
  Hash,
} from "lucide-react";
import HTTPClientConfigModal from "~/components/modals/tools/HTTPClientConfigModal";
import NeonHandle from "~/components/common/NeonHandle";

interface HTTPClientNodeProps {
  data: any;
  id: string;
}

function HTTPClientNode({ data, id }: HTTPClientNodeProps) {
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
        return "from-emerald-500 to-teal-600";
      case "error":
        return "from-red-500 to-rose-600";
      default:
        return "from-blue-500 to-purple-600";
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
            <ArrowUpCircle className="w-10 h-10 text-white drop-shadow-lg" />
            {/* Activity indicator - HTTP method badge */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
              <Globe className="w-2 h-2 text-white" />
            </div>
          </div>
        </div>

        {/* Node title */}
        <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
          {data?.displayName || data?.name || "HTTP Client"}
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

        {/* Input Handle - Template Context */}
        <NeonHandle
          type="target"
          position={Position.Left}
          id="template_context"
          isConnectable={true}
          size={10}
          color1="#00FFFF"
          glow={isHandleConnected("template_context")}
        />

        {/* Output Handles */}
        <NeonHandle
          type="source"
          position={Position.Right}
          id="response"
          isConnectable={true}
          size={10}
          color1="#10b981"
          glow={isHandleConnected("response", true)}
          style={{
            top: "20%",
          }}
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="content"
          isConnectable={true}
          size={10}
          color1="#3b82f6"
          glow={isHandleConnected("content", true)}
          style={{
            top: "40%",
          }}
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="status_code"
          isConnectable={true}
          size={10}
          color1="#f59e0b"
          glow={isHandleConnected("status_code", true)}
          style={{
            top: "60%",
          }}
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="success"
          isConnectable={true}
          size={10}
          color1="#ef4444"
          glow={isHandleConnected("success", true)}
          style={{
            top: "80%",
          }}
        />

        {/* Handle labels */}
        <div className="absolute -left-15 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 font-medium">
          Context
        </div>

        {/* Right side labels for outputs */}
        <div
          className="absolute -right-20 text-xs text-gray-500 font-medium"
          style={{ top: "10%" }}
        >
          Response
        </div>
        <div
          className="absolute -right-20 text-xs text-gray-500 font-medium"
          style={{ top: "30%" }}
        >
          Content
        </div>
        <div
          className="absolute -right-20 text-xs text-gray-500 font-medium"
          style={{ top: "50%" }}
        >
          Status Code
        </div>
        <div
          className="absolute -right-20 text-xs text-gray-500 font-medium"
          style={{ top: "70%" }}
        >
          Success
        </div>

        {/* HTTP Method Badge (if configured) */}
        {data?.method && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
            <div
              className={`px-2 py-1 rounded text-xs font-bold shadow-lg ${
                data.method === "GET"
                  ? "bg-blue-500 text-white"
                  : data.method === "POST"
                  ? "bg-green-500 text-white"
                  : data.method === "PUT"
                  ? "bg-orange-500 text-white"
                  : data.method === "DELETE"
                  ? "bg-red-500 text-white"
                  : "bg-gray-500 text-white"
              }`}
            >
              {data.method}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <HTTPClientConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default HTTPClientNode;
