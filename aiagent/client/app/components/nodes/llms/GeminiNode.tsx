import React, { useRef } from "react";
import { useReactFlow, Handle, Position } from "reactflow";
import GeminiConfigModal from "../../modals/llms/GeminiConfigModal";

interface GeminiNodeProps {
  data: any;
  id: string;
}

function GeminiNode({ data, id }: GeminiNodeProps) {
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
        <div className="bg-gray-500 p-1 rounded-2xl">
          <svg
            height="1em"
            viewBox="0 0 24 24"
            width="1em"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>Gemini</title>
            <defs>
              <linearGradient
                id="lobe-icons-gemini-fill"
                x1="0%"
                x2="68.73%"
                y1="100%"
                y2="30.395%"
              >
                <stop offset="0%" stop-color="#1C7DFF"></stop>
                <stop offset="52.021%" stop-color="#1C69FF"></stop>
                <stop offset="100%" stop-color="#F0DCD6"></stop>
              </linearGradient>
            </defs>
            <path
              d="M12 24A14.304 14.304 0 000 12 14.304 14.304 0 0012 0a14.305 14.305 0 0012 12 14.305 14.305 0 00-12 12"
              fill="url(#lobe-icons-gemini-fill)"
              fill-rule="nonzero"
            ></path>
          </svg>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{data?.name || "Gemini"}</p>
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
      <GeminiConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default GeminiNode;
