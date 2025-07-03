import React from "react";
import { Bot, Divide, Play, Split } from "lucide-react";

interface NodeType {
  id: string;
  type: string;
  label: string;
  data: any;
}

interface DraggableNodeProps {
  nodeType: NodeType;
}

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
      className="text-black  p-3 cursor-grab border-b-2 border-gray-200 hover:bg-gray-50 transition-all hover:scale-105 select-none rounded-lg"
    >
      <div className="text-sm font-medium flex items-center gap-2">
        {nodeType.type === "toolAgent" ? (
          <Bot className="w-4 h-4 text-blue-600" />
        ) : nodeType.type === "condition" ? (
          <Split className="w-4 h-4 text-green-600" />
        ) : nodeType.type === "start" ? (
          <Play className="w-4 h-4 text-green-600" />
        ) : (
          <div></div>
        )}
        {nodeType.label}
      </div>
    </div>
  );
}

export default DraggableNode;
