import React, { useRef, useState } from "react";
import { useReactFlow, Position } from "@xyflow/react";
import { Settings, Zap, Target } from "lucide-react";
import CohereRerankerConfigModal from "~/components/modals/tools/CohereRerankerConfigModal";
import NeonHandle from "~/components/common/NeonHandle";

interface CohereRerankerNodeProps {
  data: any;
  id: string;
}

function CohereRerankerNode({ data, id }: CohereRerankerNodeProps) {
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

  return (
    <>
      {/* Ana node kutusu */}
      <div
        className={`relative group w-24 h-24 rounded-2xl flex flex-col items-center justify-center 
          cursor-pointer transition-all duration-300 transform
          ${isHovered ? "scale-105" : "scale-100"}
          bg-gradient-to-br from-purple-500 to-pink-500
          ${
            isHovered
              ? `shadow-2xl shadow-purple-500/30`
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
            <Target className="w-10 h-10 text-white drop-shadow-lg" />
            {/* Settings icon */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full flex items-center justify-center">
              <Settings className="w-2 h-2 text-white" />
            </div>
          </div>
        </div>

        {/* Node title */}
        <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
          {data?.displayName || data?.name || "Cohere Reranker"}
        </div>

        {/* Input Handle */}
        <NeonHandle
          type="target"
          position={Position.Left}
          id="input"
          isConnectable={true}
          size={10}
          color1="#00FFFF"
          glow={isHandleConnected("input")}
        />

        {/* Output Handle */}
        <NeonHandle
          type="source"
          position={Position.Right}
          id="reranker"
          isConnectable={true}
          size={10}
          color1="#f87171"
          glow={isHandleConnected("reranker", true)}
        />
      </div>

      {/* Modal */}
      <CohereRerankerConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default CohereRerankerNode;