import React, { useRef } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  Background,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
} from "@xyflow/react";
import CustomEdge from "../common/CustomEdge";

interface ReactFlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: (connection: Connection) => void;
  nodeTypes: any;
  edgeTypes: any;
  activeEdges: string[];
  reactFlowWrapper: React.RefObject<HTMLDivElement | null>;
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
}

export default function ReactFlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  nodeTypes,
  edgeTypes,
  activeEdges,
  reactFlowWrapper,
  onDrop,
  onDragOver,
}: ReactFlowCanvasProps) {
  return (
    <div
      ref={reactFlowWrapper}
      className="w-full h-full"
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        nodes={nodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
          },
        }))}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      >
        <Controls position="top-right" className="bg-background text-black" />
        <Background gap={20} size={1} />
      </ReactFlow>
    </div>
  );
}
