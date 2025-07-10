import React, { useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";
import { X } from "lucide-react";

interface CustomAnimatedEdgeProps extends EdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: any;
  targetPosition: any;
  style?: React.CSSProperties;
  markerEnd?: string;
  data?: any;
}

function CustomAnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: CustomAnimatedEdgeProps) {
  const { setEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);

  // Bezier path hesapla
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Edge silme fonksiyonu
  const onEdgeClick = () => {
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  // Hover handler'ları debounce ile
  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    // Küçük bir delay ile hover'ı kaldır
    setTimeout(() => {
      setIsHovered(false);
    }, 100);
  };

  return (
    <>
      {/* Ana animated edge */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: isHovered ? "#3b82f6" : "#6b7280",
          strokeWidth: isHovered ? 3 : 2,
          animation: "dash 2s linear infinite",
          strokeDasharray: "10 5",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Invisible wider edge for better hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={30}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />

      {/* Delete button - sadece hover'da görünür */}
      <EdgeLabelRenderer>
        {isHovered && (
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: 12,
              pointerEvents: "all",
              padding: "8px", // Button çevresinde hover alanı
            }}
            className="nodrag nopan"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              className="flex items-center justify-center w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full border-2 border-white shadow-lg transition-all duration-200 hover:scale-110"
              onClick={onEdgeClick}
              title="Delete Edge"
              onMouseEnter={handleMouseEnter}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </EdgeLabelRenderer>

      {/* CSS animation styles */}
      <style jsx>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -15;
          }
        }
      `}</style>
    </>
  );
}

export default CustomAnimatedEdge;
