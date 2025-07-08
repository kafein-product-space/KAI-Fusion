import React, { useRef } from "react";
import { useReactFlow, Handle, Position } from "reactflow";
import { Bot, MemoryStick } from "lucide-react";
import InMemoryCacheConfigModal from "../../modals/cache/InMemoryCacheModal";

interface InMemoryCacheNodeProps {
  nodeType: any;
  data: any;
  id: string;
}

function InMemoryCacheNode({ nodeType, data, id }: InMemoryCacheNodeProps) {
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
    console.log(newConfig);
  };

  return (
    <>
      {/* Ana node kutusu */}
      <div
        className={`flex items-center gap-3 px-4 py-4 rounded-2xl border-2 text-red-700 font-medium cursor-pointer transition-all border-red-400 bg-red-100 hover:bg-red-200`}
        onDoubleClick={handleOpenModal}
        title="Çift tıklayarak konfigüre edin"
      >
        <div className="bg-gray-500 p-1 rounded-2xl">
          <MemoryStick />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">
              {data?.displayName || data?.name || "InMemory Cache"}
            </p>
          </div>
        </div>

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
      <InMemoryCacheConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default InMemoryCacheNode;
