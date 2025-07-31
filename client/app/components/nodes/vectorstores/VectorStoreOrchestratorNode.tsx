import React, { useRef, useState } from "react";
import { useReactFlow, Position } from "@xyflow/react";
import {
  Database,
  Trash,
  FileText,
  Search,
  BarChart3,
  Zap,
  Settings,
} from "lucide-react";
import VectorStoreOrchestratorConfigModal from "~/components/modals/vectorstores/VectorStoreOrchestratorConfigModal";
import NeonHandle from "~/components/common/NeonHandle";

interface VectorStoreOrchestratorNodeProps {
  data: any;
  id: string;
}

function VectorStoreOrchestratorNode({
  data,
  id,
}: VectorStoreOrchestratorNodeProps) {
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
        return "from-green-500 to-emerald-600";
    }
  };

  const getGlowColor = () => {
    switch (data.validationStatus) {
      case "success":
        return "shadow-emerald-500/30";
      case "error":
        return "shadow-red-500/30";
      default:
        return "shadow-green-500/30";
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
            <Database className="w-10 h-10 text-white drop-shadow-lg" />
            {/* Settings icon */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center">
              <Settings className="w-2 h-2 text-white" />
            </div>
          </div>
        </div>

        {/* Node title */}
        <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
          {data?.displayName || data?.name || "Vector Orchestrator"}
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

        {/* Input Handles */}
        <NeonHandle
          type="target"
          position={Position.Left}
          id="documents"
          isConnectable={true}
          size={10}
          color1="#4ade80"
          glow={isHandleConnected("documents")}
          style={{
            top: "30%",
          }}
        />

        <NeonHandle
          type="target"
          position={Position.Left}
          id="embedder"
          isConnectable={true}
          size={10}
          color1="#00FFFF"
          glow={isHandleConnected("embedder")}
          style={{
            top: "70%",
          }}
        />

        {/* Output Handles */}
        <NeonHandle
          type="source"
          position={Position.Right}
          id="retriever"
          isConnectable={true}
          size={10}
          color1="#4ade80"
          glow={isHandleConnected("retriever", true)}
          style={{
            top: "20%",
          }}
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="vectorstore"
          isConnectable={true}
          size={10}
          color1="#10b981"
          glow={isHandleConnected("vectorstore", true)}
          style={{
            top: "40%",
          }}
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="storage_stats"
          isConnectable={true}
          size={10}
          color1="#059669"
          glow={isHandleConnected("storage_stats", true)}
          style={{
            top: "60%",
          }}
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="index_info"
          isConnectable={true}
          size={10}
          color1="#047857"
          glow={isHandleConnected("index_info", true)}
          style={{
            top: "80%",
          }}
        />

        {/* Handle labels */}
        <div className="absolute -left-20 text-xs text-gray-500 font-medium"
             style={{ top: "25%" }}>
          Documents
        </div>
        <div className="absolute -left-20 text-xs text-gray-500 font-medium"
             style={{ top: "65%" }}>
          Embedder
        </div>

        {/* Right side labels for outputs */}
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "15%" }}
        >
          Retriever
        </div>
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "35%" }}
        >
          Vector Store
        </div>
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "55%" }}
        >
          Storage Stats
        </div>
        <div
          className="absolute -right-22 text-xs text-gray-500 font-medium"
          style={{ top: "75%" }}
        >
          Index Info
        </div>

        {/* Database Type Badge */}
        {data?.connection_string && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-green-600 text-white text-xs font-bold shadow-lg">
              PostgreSQL
            </div>
          </div>
        )}

        {/* Connection Status Indicator */}
        {data?.connected && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
            <div className="w-3 h-3 bg-green-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}
      </div>

      {/* Modal */}
      <VectorStoreOrchestratorConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default VectorStoreOrchestratorNode;