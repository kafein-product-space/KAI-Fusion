import React, { useRef } from "react";
import { useReactFlow, Handle, Position } from "@xyflow/react";
import { Link } from "lucide-react";
import LLMChainConfigModal from "../../modals/chains/LLMChainConfigModal";

interface LLMChainNodeProps {
  data: any;
  id: string;
}

function LLMChainNode({ data, id }: LLMChainNodeProps) {
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

  // Input handle konfigürasyonu
  const leftInputHandles = [
    { id: "llm", label: "LLM", required: true, position: 50 },
  ];

  const bottomInputHandles = [
    { id: "prompt", label: "Prompt", required: true, position: 50 },
  ];

  return (
    <>
      {/* Ana node kutusu */}
      <div
        className={`relative flex items-center gap-3 px-4 py-6 rounded-2xl border-2 text-gray-700 font-medium cursor-pointer transition-all border-fuchsia-400 bg-fuchsia-100 hover:bg-fuchsia-200 min-w-[200px] min-h-[100px]`}
        onDoubleClick={handleOpenModal}
        title="Çift tıklayarak konfigüre edin"
      >
        <div className="bg-white p-1 rounded-2xl">
          <Link />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">
              {data.displayName || data?.name || "LLM Chain"}
            </p>
          </div>
        </div>

        {/* Left Input Handles */}
        {leftInputHandles.map((handle) => (
          <Handle
            key={handle.id}
            type="target"
            position={Position.Left}
            id={handle.id}
            className={`w-3 h-3 border-2 border-white ${
              handle.required ? "!bg-red-500" : "!bg-teal-500"
            }`}
            style={{
              top: `${handle.position}%`,
              left: "-6px",
            }}
            title={`${handle.label}${
              handle.required ? " (Required)" : " (Optional)"
            }`}
          />
        ))}

        {/* Bottom Input Handles */}
        {bottomInputHandles.map((handle) => (
          <Handle
            key={handle.id}
            type="target"
            position={Position.Bottom}
            id={handle.id}
            className={`w-3 h-3 border-2 border-white ${
              handle.required ? "!bg-red-500" : "!bg-teal-500"
            }`}
            style={{
              left: `${handle.position}%`,
              bottom: "-6px",
            }}
            title={`${handle.label}${
              handle.required ? " (Required)" : " (Optional)"
            }`}
          />
        ))}

        {/* Left Input Labels - Dışarıda */}
        {leftInputHandles.map((handle) => (
          <div
            key={`label-${handle.id}`}
            className="absolute text-xs text-gray-600 font-medium pointer-events-none whitespace-nowrap"
            style={{
              left: "-40px",
              top: `${handle.position}%`,
              transform: "translateY(-50%)",
            }}
          >
            {handle.label}
            {handle.required && <span className="text-red-500 ml-1">*</span>}
          </div>
        ))}

        {/* Bottom Input Labels - Dışarıda */}
        {bottomInputHandles.map((handle) => (
          <div
            key={`label-${handle.id}`}
            className="absolute text-xs text-gray-600 font-medium pointer-events-none whitespace-nowrap"
            style={{
              left: `${handle.position}%`,
              bottom: "-20px",
              transform: "translateX(-50%)",
            }}
          >
            {handle.label}
            {handle.required && <span className="text-red-500 ml-1">*</span>}
          </div>
        ))}

        {/* Output Handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          className="w-3 h-3 !bg-fuchsia-500 border-2 border-white"
          style={{
            right: "-6px",
            top: "50%",
          }}
          title="LLM Chain Output"
        />

        {/* Right Output Label - Dışarıda */}
        <div
          className="absolute text-xs text-gray-600 font-medium pointer-events-none whitespace-nowrap"
          style={{
            right: "-50px",
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          Output
        </div>
      </div>

      {/* DaisyUI dialog modal */}
      <LLMChainConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default LLMChainNode;
