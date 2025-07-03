import React from "react";
import { useReactFlow, BaseEdge, EdgeLabelRenderer, getBezierPath } from "reactflow";
import { X } from "lucide-react";

interface CustomEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

function CustomEdge({ id, sourceX, sourceY, targetX, targetY }: CustomEdgeProps) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <EdgeLabelRenderer>
        <button
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag bg-red-500 nopan rounded-full w-6 h-6 border-2 border-white p-1 hover:bg-red-600 text-white text-xs flex justify-center items-center shadow-lg"
          onClick={() => {
            setEdges((es: any[]) => es.filter((e) => e.id !== id));
          }}
        >
          <X className="w-3 h-3" />
        </button>
      </EdgeLabelRenderer>
    </>
  );
}

export default CustomEdge; 