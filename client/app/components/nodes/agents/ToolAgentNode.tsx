import React, { useRef } from "react";
import { useReactFlow, Handle, Position } from "reactflow";
import { Bot } from "lucide-react";
import AgentConfigModal from "../../modals/agents/AgentConfigModal";

interface ToolAgentNodeProps {
  data: any;
  id: string;
}

function ToolAgentNode({ data, id }: ToolAgentNodeProps) {
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
    { id: "prompt", label: "Prompt", required: true, position: 50 },
  ];

  const bottomInputHandles = [
    { id: "llm", label: "LLM", required: true, position: 25 },
    { id: "tools", label: "Tools", required: true, position: 75 },
    { id: "memory", label: "Memory", required: false, position: 50 },
  ];

  return (
    <>
      {/* Ana node kutusu */}
      <div
        className={`relative flex items-center gap-3 px-4 py-6 rounded-2xl border-2 text-gray-700 font-medium cursor-pointer transition-all border-blue-400 bg-blue-100 hover:bg-blue-200 min-w-[200px] min-h-[100px]`}
        onDoubleClick={handleOpenModal}
        title="Çift tıklayarak konfigüre edin"
      >
        <div className="bg-blue-500 p-3 rounded-2xl">
          <Bot className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">
              {data?.displayName || data?.name || "Tool Agent"}
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

        {/* Left Input Labels */}
        <div className="absolute left-4 top-0 h-full flex flex-col justify-around py-2 pointer-events-none">
          {leftInputHandles.map((handle) => (
            <div
              key={`label-${handle.id}`}
              className="text-xs text-gray-600 font-medium"
              style={{
                transform: "translateY(-50%)",
                marginTop: `${handle.position}%`,
              }}
            >
              {handle.label}
              {handle.required && <span className="text-red-500 ml-1">*</span>}
            </div>
          ))}
        </div>

        {/* Bottom Input Labels */}
        <div className="absolute bottom-4 left-0 w-full flex justify-around pointer-events-none">
          {bottomInputHandles.map((handle) => (
            <div
              key={`label-${handle.id}`}
              className="text-xs text-gray-600 font-medium whitespace-nowrap"
            >
              {handle.label}
              {handle.required && <span className="text-red-500 ml-1">*</span>}
            </div>
          ))}
        </div>

        {/* Output Handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          className="w-3 h-3 !bg-blue-500 border-2 border-white"
          style={{
            right: "-6px",
            top: "50%",
          }}
          title="Agent Output"
        />
      </div>

      {/* DaisyUI dialog modal */}
      <AgentConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
      />
    </>
  );
}

export default ToolAgentNode;
