import React, { useRef, useState } from "react";
import { useReactFlow, Handle, Position } from "@xyflow/react";
import { Bot, Trash } from "lucide-react";
import AgentConfigModal from "../../modals/agents/AgentConfigModal";

interface ToolAgentNodeProps {
  data: any;
  id: string;
}

function ToolAgentNode({ data, id }: ToolAgentNodeProps) {
  const { setNodes } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
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
  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  // Input handle konfigürasyonu
  const leftInputHandles = [
    { id: "input", label: "", required: true, position: 50 },
  ];

  const bottomInputHandles = [
    { id: "chat_model", label: "Chat Model", required: true, position: 20 },
    { id: "memory", label: "Memory", required: false, position: 50 },
    { id: "tool", label: "Tool", required: false, position: 80 },
  ];

  return (
    <>
      {/* Ana node kutusu */}
      <div
        className={`relative flex flex-col items-center gap-2 px-6 py-4 rounded-xl border-2 text-gray-700 font-medium cursor-pointer transition-all border-gray-300 bg-white hover:bg-gray-50 min-w-[160px] min-h-[80px] shadow-sm`}
        onDoubleClick={handleOpenModal}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Double click to configure"
      >
        {/* Icon ve Title */}
        <div className="flex items-center gap-2">
          <div className="bg-gray-600 p-2 rounded-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col items-start">
            <p className="font-semibold text-sm">
              {data?.displayName || "AI Agent"}
            </p>
            <p className="text-xs text-gray-500">
              {data?.agentType || "Tools Agent"}
            </p>
          </div>
        </div>
        {isHovered && (
          <button
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full border-2 border-white shadow-lg transition-all duration-200 hover:scale-110 flex items-center justify-center z-10"
            onClick={handleDeleteNode}
            title="Delete Node"
          >
            <Trash size={8} />
          </button>
        )}
        {/* Left Input Handle */}
        {leftInputHandles.map((handle) => (
          <Handle
            key={handle.id}
            type="target"
            position={Position.Left}
            id={handle.id}
            className="w-3 h-3 border-2 border-gray-300 !bg-gray-400"
            style={{
              width: 10,
              height: 10,
              top: `${handle.position}%`,
              left: "-1px",
            }}
            title="Input"
          />
        ))}

        {/* Bottom Input Handles */}
        {bottomInputHandles.map((handle) => (
          <Handle
            key={handle.id}
            type="target"
            position={Position.Bottom}
            id={handle.id}
            className={`w-3 h-3 border-2 border-white
              !bg-gray-400
            `}
            style={{
              width: 10,
              height: 10,
              left: `${handle.position}%`,
              bottom: "-1px",
            }}
            title={`${handle.label}${
              handle.required ? " (Required)" : " (Optional)"
            }`}
          />
        ))}

        {/* Bottom Input Labels */}
        <div className="absolute -bottom-8 left-0 w-full flex justify-around pointer-events-none">
          {bottomInputHandles.map((handle) => (
            <div
              key={`label-${handle.id}`}
              className="text-xs text-gray-500 font-medium whitespace-nowrap"
              style={{
                marginLeft: `${
                  handle.position === 20
                    ? "-10px"
                    : handle.position === 80
                    ? "10px"
                    : "0px"
                }`,
              }}
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
          className="w-3 h-3  border-2 border-white !bg-gray-400"
          style={{
            width: 10,
            height: 10,
            right: "-1px",
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
