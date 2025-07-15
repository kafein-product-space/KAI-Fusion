import React, { useRef } from "react";
import { useReactFlow, Handle, Position } from "@xyflow/react";
import { Link } from "lucide-react";
import AgentConfigModal from "../../modals/agents/AgentConfigModal";
import OpenAIChatNodeModal from "../../modals/llms/OpenAIChatModal";
import ConditionalChainConfigModal from "../../modals/chains/ConditionalChainConfigModal";

interface ConditionalChainNodeProps {
  data: any;
  id: string;
}

function ConditionalChainNode({ data, id }: ConditionalChainNodeProps) {
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
        className={`flex items-center gap-3 px-4 py-4 rounded-2xl border-2 text-gray-700 font-medium cursor-pointer transition-all border-fuchsia-400 bg-fuchsia-100 hover:bg-fuchsia-200`}
        onDoubleClick={handleOpenModal}
        title="Çift tıklayarak konfigüre edin"
      >
        <div className="bg-white p-1 rounded-2xl">
          <Link />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">
              {data?.displayName || "Conditional Chain"}
            </p>
          </div>
        </div>
        {/* default chain */}
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className="w-16 !bg-gray-500"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          className="w-3 h-3 bg-gray-500"
        />
      </div>

      {/* DaisyUI dialog modal */}
      <ConditionalChainConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default ConditionalChainNode;
