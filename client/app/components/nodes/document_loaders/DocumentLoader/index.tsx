// index.tsx
import React, { useState } from "react";
import { useReactFlow } from "@xyflow/react";
import DocumentLoaderVisual from "./DocumentLoaderVisual";
import type { DocumentLoaderNodeProps } from "./types";

export default function DocumentLoaderNode({
  data,
  id,
}: DocumentLoaderNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const edges = getEdges?.() ?? [];

  const isHandleConnected = (handleId: string, isSource = false) =>
    edges.some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );

  return (
    <DocumentLoaderVisual
      data={data}
      isHovered={isHovered}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDelete={(e) => {
        e.stopPropagation();
        setNodes((nodes) => nodes.filter((node) => node.id !== id));
      }}
      isHandleConnected={isHandleConnected}
    />
  );
}
