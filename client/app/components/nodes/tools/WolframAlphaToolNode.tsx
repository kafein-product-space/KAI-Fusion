import React, { useRef } from "react";
import { useReactFlow, Handle, Position } from "reactflow";
import { Bot, Calculator } from "lucide-react";
import WolframAlphaToolConfigModal from "../../modals/tools/WolframAlphaToolConfigModal";

interface WolframAlphaToolNodeProps {
  data: any;
  id: string;
}

function WolframAlphaToolNode({ data, id }: WolframAlphaToolNodeProps) {
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
        <div className="bg-white p-3 rounded-2xl">
          <Calculator />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{data?.displayName || data?.name}</p>
          </div>
        </div>

        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className="w-16 !bg-teal-500"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          className="w-3 h-3 bg-blue-500"
        />
      </div>

      {/* DaisyUI dialog modal */}
      <WolframAlphaToolConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default WolframAlphaToolNode;
