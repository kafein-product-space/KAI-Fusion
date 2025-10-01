import React from "react";
import { Position } from "@xyflow/react";
import { Type, Trash } from "lucide-react";
import NeonHandle from "~/components/common/NeonHandle";
import type { StringInputData } from "./types";

interface StringInputVisualProps {
  data: StringInputData;
  isHovered: boolean;
  onDoubleClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isHandleConnected: (handleId: string, isSource?: boolean) => boolean;
}

export default function StringInputVisual({
  data,
  isHovered,
  onDoubleClick,
  onMouseEnter,
  onMouseLeave,
  onDelete,
  isHandleConnected,
}: StringInputVisualProps) {
  
  return (
    <div
      className={`relative group w-24 h-24 rounded-2xl flex flex-col items-center justify-center 
        cursor-pointer transition-all duration-300 transform
        ${isHovered ? "scale-105" : "scale-100"}
        bg-gradient-to-br from-blue-500 to-indigo-600
        ${
          isHovered
            ? "shadow-2xl shadow-blue-500/30"
            : "shadow-lg shadow-black/50"
        }
        border border-white/20 backdrop-blur-sm
        hover:border-white/40`}
      onDoubleClick={onDoubleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      title="Double click to configure"
    >
      {/* Background pattern */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>

      {/* Main icon - T letter */}
      <div className="relative z-10 mb-2">
        <Type className="w-10 h-10 text-white drop-shadow-lg" />
      </div>

      {/* Node title */}
      <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
        String Input
      </div>

      {/* Delete button */}
      {isHovered && (
        <button
          className="absolute -top-3 -right-3 w-8 h-8 
            bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500
            text-white rounded-full border border-white/30 shadow-xl 
            transition-all duration-200 hover:scale-110 flex items-center justify-center z-20
            backdrop-blur-sm"
          onClick={onDelete}
          title="Delete Node"
        >
          <Trash size={14} />
        </button>
      )}

      {/* Input Handle */}
      <NeonHandle
        type="target"
        position={Position.Left}
        id="input"
        isConnectable={true}
        size={10}
        color1="#3b82f6"
        glow={isHandleConnected("input")}
      />

      {/* Output Handle */}
      <NeonHandle
        type="source"
        position={Position.Right}
        id="output"
        isConnectable={true}
        size={10}
        color1="#3b82f6"
        glow={isHandleConnected("output", true)}
      />

      {/* Documents Handle (hidden for VectorStore compatibility) */}
      <NeonHandle
        type="source"
        position={Position.Right}
        id="documents"
        isConnectable={true}
        size={0}
        color1="#10b981"
        glow={false}
        style={{ opacity: 0 }}
      />
    </div>
  );
}