import React, { useRef } from "react";
import { useReactFlow, Handle, Position } from "reactflow";
import ConversationMemoryConfigModal from "../modals/ConversationMemoryConfigModal";

interface ConversationMemoryNodeProps {
  data: any;
  id: string;
}

function ConversationMemoryNode({ data, id }: ConversationMemoryNodeProps) {
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
            xmlns="http://www.w3.org/2000/svg"
            x="0px"
            y="0px"
            width="20"
            height="20"
            viewBox="0 0 32 32"
          >
            <path d="M 16 5 C 15.844 5 15.687922 5.0298438 15.544922 5.0898438 L 3.1953125 10.785156 C 2.9353125 10.905156 2.9353125 11.092891 3.1953125 11.212891 L 15.544922 16.910156 C 15.687922 16.970156 15.844 17 16 17 C 16.156 17 16.312078 16.970156 16.455078 16.910156 L 28.804688 11.212891 C 29.064688 11.092891 29.064687 10.905156 28.804688 10.785156 L 16.455078 5.0898438 C 16.312078 5.0298438 16.156 5 16 5 z M 16 7.0820312 L 24.492188 11 L 16 14.917969 L 7.5078125 11 L 16 7.0820312 z M 4.8398438 14.447266 L 3.1953125 15.269531 C 2.9353125 15.399531 2.9353125 15.600469 3.1953125 15.730469 L 15.544922 21.902344 C 15.687922 21.967344 15.844 22 16 22 C 16.156 22 16.312078 21.967344 16.455078 21.902344 L 28.804688 15.730469 C 29.064688 15.600469 29.064687 15.399531 28.804688 15.269531 L 27.160156 14.447266 L 16.455078 19.796875 C 16.312078 19.861875 16.156 19.894531 16 19.894531 C 15.844 19.894531 15.687922 19.861875 15.544922 19.796875 L 4.8398438 14.447266 z M 4.8398438 19.447266 L 3.1953125 20.269531 C 2.9353125 20.399531 2.9353125 20.600469 3.1953125 20.730469 L 15.544922 26.902344 C 15.687922 26.967344 15.844 27 16 27 C 16.156 27 16.312078 26.967344 16.455078 26.902344 L 28.804688 20.730469 C 29.064688 20.600469 29.064687 20.399531 28.804688 20.269531 L 27.160156 19.447266 L 16.455078 24.796875 C 16.312078 24.861875 16.156 24.894531 16 24.894531 C 15.844 24.894531 15.687922 24.861875 15.544922 24.796875 L 4.8398438 19.447266 z"></path>
          </svg>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">
              {data?.name || "Conversation Memory"}
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
      <ConversationMemoryConfigModal
        ref={modalRef}
        nodeData={data}
        onSave={handleConfigSave}
        nodeId={id}
      />
    </>
  );
}

export default ConversationMemoryNode;
