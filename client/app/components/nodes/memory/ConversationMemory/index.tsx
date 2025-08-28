// ConversationMemory/index.tsx
import React, { useState } from "react";
import { useReactFlow } from "@xyflow/react";
import ConversationMemoryVisual from "./ConversationMemoryVisual";
import type { ConversationMemoryNodeProps } from "./types";

export default function ConversationMemoryNode({ data, id }: ConversationMemoryNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);

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

  const edges = getEdges ? getEdges() : [];

  const isHandleConnected = (handleId: string, isSource = false) =>
    edges.some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );

  return (
    <ConversationMemoryVisual
      data={data}
      isHovered={isHovered}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDelete={handleDeleteNode}
      isHandleConnected={isHandleConnected}
    />
  );
}