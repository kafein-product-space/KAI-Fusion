import React, { useRef, useState } from "react";
import { useReactFlow, Position } from "@xyflow/react";
import { Sparkles, Trash } from "lucide-react";
import OpenAIDocumentEmbedderConfigModal from "~/components/modals/embeddings/OpenAIDocumentEmbedderConfigModal";
import NeonHandle from "~/components/common/NeonHandle";

interface OpenAIDocumentEmbedderNodeProps {
  data: any;
  id: string;
}

function OpenAIDocumentEmbedderNode({
  data,
  id,
}: OpenAIDocumentEmbedderNodeProps) {
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
          <Sparkles className="w-8 h-8 text-blue-500" />
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
          {data?.displayName || data?.name || "OpenAI Embedder"}
        </div>

        {/* Input Handle */}
        <NeonHandle
          type="target"
          position={Position.Left}
          id="chunks"
          isConnectable={true}
          color1="#00FFFF"
          glow={isHandleConnected("chunks")}
          className="absolute w-3 h-3 transition-all z-20"
          style={{
            left: -6,
            top: "50%",
            transform: "translateY(-50%)",
          }}
          title="Document Chunks (Required)"
        />

        {/* Output Handles */}
        <NeonHandle
          type="source"
          position={Position.Right}
          id="embedded_docs"
          isConnectable={true}
          color1="#0ea5e9"
          glow={isHandleConnected("embedded_docs", true)}
          className="absolute w-3 h-3 transition-all z-20"
          style={{
            right: -6,
            top: "30%",
            transform: "translateY(-50%)",
          }}
          title="Embedded Documents"
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="vectors"
          isConnectable={true}
          color1="#0ea5e9"
          glow={isHandleConnected("vectors", true)}
          className="absolute w-3 h-3 transition-all z-20"
          style={{
            right: -6,
            top: "50%",
            transform: "translateY(-50%)",
          }}
          title="Raw Vectors"
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="embedding_stats"
          isConnectable={true}
          color1="#0ea5e9"
          glow={isHandleConnected("embedding_stats", true)}
          className="absolute w-3 h-3 transition-all z-20"
          style={{
            right: -6,
            top: "70%",
            transform: "translateY(-50%)",
          }}
          title="Embedding Stats"
        />
      </div>

      {/* Modal */}
      <OpenAIDocumentEmbedderConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default OpenAIDocumentEmbedderNode;
