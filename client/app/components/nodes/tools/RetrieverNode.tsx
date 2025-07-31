import React, { useRef, useState } from "react";
import { useReactFlow, Position } from "@xyflow/react";
import { Search, Settings, Database, Zap, Trash } from "lucide-react";
import RetrieverConfigModal from "~/components/modals/tools/RetrieverConfigModal";
import NeonHandle from "~/components/common/NeonHandle";

interface RetrieverNodeProps {
  data: any;
  id: string;
}

function RetrieverNode({ data, id }: RetrieverNodeProps) {
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

  const edges = getEdges ? getEdges() : [];
  const isHandleConnected = (handleId: string, isSource = false) =>
    edges.some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );
  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };
  return (
    <>
      {/* Ana node kutusu */}
      <div
        className={`relative group w-24 h-24 rounded-2xl flex flex-col items-center justify-center 
          cursor-pointer transition-all duration-300 transform
          ${isHovered ? "scale-105" : "scale-100"}
          bg-gradient-to-br from-indigo-500 to-purple-600
          ${
            isHovered
              ? `shadow-2xl shadow-indigo-500/30`
              : "shadow-lg shadow-black/50"
          }
          border border-white/20 backdrop-blur-sm
          hover:border-white/40`}
        onDoubleClick={handleOpenModal}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Double click to configure"
      >
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
        {/* Background pattern */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>

        {/* Main icon */}
        <div className="relative z-10 mb-2">
          <div className="relative">
            <Search className="w-10 h-10 text-white drop-shadow-lg" />
            {/* Settings icon */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center">
              <Settings className="w-2 h-2 text-white" />
            </div>
          </div>
        </div>

        {/* Node title */}
        <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
          {data?.displayName || data?.name || "Retriever"}
        </div>

        {/* Input Handles */}
        <NeonHandle
          type="target"
          position={Position.Left}
          id="embedder"
          isConnectable={true}
          size={10}
          color1="#00FFFF"
          glow={isHandleConnected("embedder")}
          style={{
            top: "30%",
          }}
        />

        <NeonHandle
          type="target"
          position={Position.Left}
          id="reranker"
          isConnectable={true}
          size={10}
          color1="#f87171"
          glow={isHandleConnected("reranker")}
          style={{
            top: "70%",
          }}
        />

        {/* Output Handle */}
        <NeonHandle
          type="source"
          position={Position.Right}
          id="retriever_tool"
          isConnectable={true}
          size={10}
          color1="#818cf8"
          glow={isHandleConnected("retriever_tool", true)}
        />

        {/* Handle labels */}
        <div
          className="absolute -left-20 text-xs text-gray-500 font-medium"
          style={{ top: "25%" }}
        >
          Embedder
        </div>
        <div
          className="absolute -left-20 text-xs text-gray-500 font-medium"
          style={{ top: "65%" }}
        >
          Reranker
        </div>
        <div
          className="absolute -right-24 text-xs text-gray-500 font-medium"
          style={{ top: "45%" }}
        >
          Retriever Tool
        </div>

        {/* Database Type Badge */}
        {data?.database_connection && (
          <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 z-10">
            <div className="px-2 py-1 rounded bg-indigo-600 text-white text-xs font-bold shadow-lg">
              <Database className="w-3 h-3 inline mr-1" />
              Database
            </div>
          </div>
        )}

        {/* Connection Status Indicator */}
        {data?.connected && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-10">
            <div className="w-3 h-3 bg-indigo-400 rounded-full shadow-lg animate-pulse"></div>
          </div>
        )}
      </div>

      {/* Modal */}
      <RetrieverConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default RetrieverNode;
