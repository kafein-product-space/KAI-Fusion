import React, { useRef } from "react";
import { useReactFlow, Handle, Position } from "reactflow";
import { FileText } from "lucide-react";
import TextLoaderModal from "./modals/TextLoaderModal";

interface TextLoaderNodeProps {
  data: any;
  id: string;
}

function TextLoaderNode({ data, id }: TextLoaderNodeProps) {
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
        className={`flex items-center gap-3 px-4 py-4 rounded-2xl border-2 text-gray-700 font-medium cursor-pointer transition-all border-pink-400 bg-pink-100 hover:bg-pink-200`}
        onDoubleClick={handleOpenModal}
        title="Çift tıklayarak konfigüre edin"
      >
        <div className="bg-pink-500 p-3 rounded-2xl">
          <FileText className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{data?.name || "TextLoader"}</p>
          </div>
        </div>

        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className="w-16 !bg-pink-500"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          className="w-3 h-3 bg-pink-500"
        />
      </div>

      {/* DaisyUI dialog modal */}
      <TextLoaderModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default TextLoaderNode;
