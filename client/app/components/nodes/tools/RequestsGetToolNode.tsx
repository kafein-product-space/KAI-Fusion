import React, { useRef } from "react";
import { useReactFlow, Handle, Position } from "reactflow";
import { ArrowDownToLine, Bot } from "lucide-react";
import AgentConfigModal from "../../modals/agents/AgentConfigModal";
import OpenAIChatNodeModal from "../../modals/llms/OpenAIChatModal";
import RedisCacheConfigModal from "../../modals/cache/RedisCacheModal";
import RequestsGetToolModal from "../../modals/tools/RequestsGetToolModal";

interface RequestsGetToolNodeProps {
  data: any;
  id: string;
}

function RequestsGetToolNode({ data, id }: RequestsGetToolNodeProps) {
  const { setNodes } = useReactFlow();

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

  return (
    <>
      {/* Ana node kutusu */}
      <div
        className={`flex items-center gap-3 px-4 py-4 rounded-2xl border-2 text-yellow-700 font-medium cursor-pointer transition-all border-yellow-400 bg-yellow-100 hover:bg-yellow-200`}
        onDoubleClick={handleOpenModal}
        title="Çift tıklayarak konfigüre edin"
      >
        <div className="bg-white p-1 rounded-2xl">
          <ArrowDownToLine />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{data?.name || "RequestsGetTool"}</p>
          </div>
        </div>

        <Handle
          type="source"
          position={Position.Right}
          id="output"
          className="w-3 h-3 bg-gray-500"
        />
      </div>

      {/* DaisyUI dialog modal */}
      <RequestsGetToolModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default RequestsGetToolNode;
