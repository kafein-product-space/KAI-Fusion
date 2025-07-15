import React, { useRef } from "react";
import { useReactFlow, Handle, Position } from "@xyflow/react";
import ClaudeConfigModal from "../../modals/llms/ClaudeConfigModal";
import SummaryMemoryConfigModal from "../../modals/memory/SummaryMemoryConfigModal";
import StringOutputParserConfigModal from "../../modals/output_parsers/StringOutputParserConfigModal";
import { Database } from "lucide-react";
import FaissVectorStoreConfigModal from "~/components/modals/vector_stores/FaissVectorStoreConfigModal";

interface FaissVectorStoreNodeProps {
  data: any;
  id: string;
}

function FaissVectorStoreNode({ data, id }: FaissVectorStoreNodeProps) {
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
          <Database />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">
              {data?.displayName || data?.name || "Faiss Vector Store"}
            </p>
          </div>
        </div>
        {/*embeddings */}

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
      <FaissVectorStoreConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default FaissVectorStoreNode;
