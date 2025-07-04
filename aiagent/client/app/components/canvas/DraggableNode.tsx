import React from "react";
import type { ReactElement } from "react";
import { Bot, Divide, Play, Split } from "lucide-react";

interface NodeType {
  id: string;
  type: string;
  label: string;
  data: any;
  info: string;
}

interface DraggableNodeProps {
  nodeType: NodeType;
}

// Node type -> icon haritası
const nodeTypeIconMap: Record<string, ReactElement> = {
  ReactAgent: <Bot className="w-6 h-6 text-blue-600" />,
  toolAgent: <Bot className="w-6 h-6 text-blue-600" />,
  ConditionNode: <Split className="w-6 h-6 text-green-600" />,
  condition: <Split className="w-6 h-6 text-green-600" />,
  StartNode: <Play className="w-6 h-6 text-green-600" />,
  start: <Play className="w-6 h-6 text-green-600" />,
  // Yeni node tipleri buraya eklenebilir
};

function DraggableNode({ nodeType }: DraggableNodeProps) {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    event.stopPropagation();
    event.dataTransfer.setData(
      "application/reactflow",
      JSON.stringify(nodeType)
    );
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="text-black flex items-center gap-2  p-3  hover:bg-gray-200 transition-all select-none cursor-grab rounded-2xl"
    >
      <div className="flex items-center gap-2">
        {nodeTypeIconMap[nodeType.type] || <></>}
      </div>
      <div className="flex flex-col gap-2">
        <div>
          <h2 className="text-md font-medium text-gray-700">
            {nodeType.label}
          </h2>
        </div>
        <div>
          <p className="text-xs text-gray-500">{nodeType.info}</p>
        </div>
      </div>
    </div>
  );
}

export default DraggableNode;
