import React, { useRef, useState } from "react";
import { useReactFlow, Position } from "@xyflow/react";
import { Database, Trash } from "lucide-react";
import PostgreSQLVectorStoreConfigModal from "~/components/modals/vectorstores/PostgreSQLVectorStoreConfigModal";
import NeonHandle from "~/components/common/NeonHandle";

interface PostgreSQLVectorStoreNodeProps {
  data: any;
  id: string;
}

function PostgreSQLVectorStoreNode({
  data,
  id,
}: PostgreSQLVectorStoreNodeProps) {
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
              : "border-green-400"
          }
          bg-green-50 hover:bg-green-100`}
        onDoubleClick={handleOpenModal}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Çift tıklayarak konfigüre edin"
      >
        <div className="rounded-2xl">
          <Database className="w-8 h-8 text-green-600" />
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
          className="absolute text-xs text-green-700 font-medium pointer-events-none whitespace-nowrap"
          style={{
            bottom: "-30%",
            transform: "translateY(-50%)",
          }}
        >
          {data?.displayName || data?.name || "PostgreSQL Vector Store"}
        </div>

        {/* Input Handles */}
        <NeonHandle
          type="target"
          position={Position.Left}
          id="documents"
          isConnectable={true}
          color1="#4ade80"
          glow={isHandleConnected("documents", false)}
          className="absolute w-3 h-3 transition-all z-20"
          style={{
            left: -6,
            top: "50%",
            transform: "translateY(-50%)",
          }}
          title="Documents"
        />

        {/* Output Handles */}
        <NeonHandle
          type="source"
          position={Position.Right}
          id="retriever"
          isConnectable={true}
          color1="#4ade80"
          glow={isHandleConnected("retriever", true)}
          className="absolute w-3 h-3 transition-all z-20"
          style={{
            right: -6,
            top: "25%",
            transform: "translateY(-50%)",
          }}
          title="Retriever"
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="vectorstore"
          isConnectable={true}
          color1="#4ade80"
          glow={isHandleConnected("vectorstore", true)}
          className="absolute w-3 h-3 transition-all z-20"
          style={{
            right: -6,
            top: "45%",
            transform: "translateY(-50%)",
          }}
          title="Vector Store"
        />

        <NeonHandle
          type="source"
          position={Position.Right}
          id="storage_stats"
          isConnectable={true}
          color1="#4ade80"
          glow={isHandleConnected("storage_stats", true)}
          className="absolute w-3 h-3 transition-all z-20"
          style={{
            right: -6,
            top: "65%",
            transform: "translateY(-50%)",
          }}
          title="Storage Stats"
        />
      </div>

      {/* Modal */}
      <PostgreSQLVectorStoreConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default PostgreSQLVectorStoreNode;
