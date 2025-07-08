import React, { useRef } from "react";
import { useReactFlow, Handle, Position } from "reactflow";
import ClaudeConfigModal from "../../modals/llms/ClaudeConfigModal";

interface ClaudeNodeProps {
  data: any;
  id: string;
}

function ClaudeNode({ data, id }: ClaudeNodeProps) {
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
        className={`flex items-center gap-3 px-4 py-4 rounded-2xl border-2 text-gray-700 font-medium cursor-pointer transition-all border-gray-400 bg-gray-100 hover:bg-gray-200`}
        onDoubleClick={handleOpenModal}
        title="Çift tıklayarak konfigüre edin"
      >
        <div className="bg-white p-1 rounded-2xl">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            x="0px"
            y="0px"
            width="30"
            height="30"
            viewBox="0 0 48 48"
          >
            <path
              fill="#d19b75"
              d="M40,6H8C6.895,6,6,6.895,6,8v32c0,1.105,0.895,2,2,2h32c1.105,0,2-0.895,2-2V8	C42,6.895,41.105,6,40,6z"
            ></path>
            <path
              fill="#252525"
              d="M22.197,14.234h-4.404L10.037,33.67c0-0.096,4.452,0,4.452,0l1.484-4.069h8.234l1.58,4.069h4.261	L22.197,14.234z M17.362,26.059l2.729-6.894l2.633,6.894C22.723,26.059,17.266,26.059,17.362,26.059z"
            ></path>
            <path
              fill="#252525"
              d="M25.963,14.234L33.59,33.67h4.356l-7.803-19.436C30.144,14.234,25.963,14.186,25.963,14.234z"
            ></path>
          </svg>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">
              {data?.displayName || data?.name || "Claude"}
            </p>
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
      <ClaudeConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default ClaudeNode;
