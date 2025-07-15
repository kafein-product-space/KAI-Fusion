import React, { useRef } from "react";
import { useReactFlow, Handle, Position } from "@xyflow/react";
import { SquareCode } from "lucide-react";
import PDFLoaderConfigModal from "../../modals/document_loaders/PDFLoaderConfigModal";
import PydanticOutputParserConfigModal from "../../modals/output_parsers/PydanticOutputParserConfigModal";

interface PydanticOutputParserNodeProps {
  data: any;
  id: string;
}

function PydanticOutputParserNode({ data, id }: PydanticOutputParserNodeProps) {
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
        className={`flex items-center gap-3 px-4 py-4 rounded-2xl border-2 text-gray-700 font-medium cursor-pointer transition-all border-amber-400 bg-amber-100 hover:bg-amber-200`}
        onDoubleClick={handleOpenModal}
        title="Çift tıklayarak konfigüre edin"
      >
        <div className="bg-white p-1 rounded-2xl">
          <SquareCode />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">
              {data?.displayName || data?.name || "Pydantic Output Parser"}
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
      <PydanticOutputParserConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default PydanticOutputParserNode;
