import React, { useRef } from "react";
import { useReactFlow, Handle, Position } from "@xyflow/react";
import ConversationMemoryConfigModal from "../../modals/memory/ConversationMemoryConfigModal";
import { MessageCircle } from "lucide-react";
import NeonHandle from "~/components/common/NeonHandle";

interface ConversationMemoryNodeProps {
  data: any;
  id: string;
}

function ConversationMemoryNode({ data, id }: ConversationMemoryNodeProps) {
  const { setNodes, getEdges } = useReactFlow();

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
        className={`flex items-center gap-3 px-4 py-4 rounded-2xl border-2 text-gray-700 font-medium cursor-pointer transition-all
          ${
            data.validationStatus === "success"
              ? "border-green-500"
              : data.validationStatus === "error"
              ? "border-red-500"
              : "border-green-400"
          }
          bg-green-100 hover:bg-green-200`}
        onDoubleClick={handleOpenModal}
        title="Çift tıklayarak konfigüre edin"
      >
        <div className="bg-white p-1 rounded-2xl">
          <MessageCircle />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">
              {data?.displayName || data?.name || "Conversation Memory"}
            </p>
          </div>
        </div>

        <NeonHandle
          type="source"
          position={Position.Right}
          id="output"
          isConnectable={true}
          size={10}
          color1="#00FFFF"
          glow={isHandleConnected("output", true)}
        />
      </div>

      {/* DaisyUI dialog modal */}
      <ConversationMemoryConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default ConversationMemoryNode;
