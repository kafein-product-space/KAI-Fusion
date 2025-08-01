import { Database, Activity, Trash, Brain, HardDrive } from "lucide-react";
import NeonHandle from "~/components/common/NeonHandle";
import { Position } from "@xyflow/react";

export default function BufferMemoryDisplay({
  data,
  isHovered,
  onDoubleClick,
  onHoverEnter,
  onHoverLeave,
  onDelete,
  isHandleConnected,
  getStatusColor,
  getGlowColor,
}: {
  data: any;
  isHovered: boolean;
  onDoubleClick: () => void;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  onDelete: (e: any) => void;
  isHandleConnected: (handleId: string, isSource?: boolean) => boolean;
  getStatusColor: () => string;
  getGlowColor: () => string;
}) {
  return (
    <div className="relative group">
      <div
        className={`relative w-24 h-24 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer transform
            ${
              isHovered ? "scale-105" : "scale-100"
            } bg-gradient-to-br ${getStatusColor()} 
            ${
              isHovered
                ? `shadow-2xl ${getGlowColor()}`
                : "shadow-lg shadow-black/50"
            } border border-white/20 backdrop-blur-sm hover:border-white/40`}
        onDoubleClick={onDoubleClick}
        onMouseEnter={onHoverEnter}
        onMouseLeave={onHoverLeave}
      >
        {/* Icon */}
        <div className="relative z-10 mb-2">
          <Database className="w-10 h-10 text-white drop-shadow-lg" />
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center">
            <Activity className="w-2 h-2 text-white" />
          </div>
        </div>

        {/* Title */}
        <div className="text-white text-xs font-semibold text-center z-10">
          {data?.displayName || data?.name || "Buffer Memory"}
        </div>

        {/* Delete Button */}
        {isHovered && (
          <button
            className="absolute -top-3 -right-3 w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full border shadow-xl hover:scale-110 transition-all flex items-center justify-center"
            onClick={onDelete}
          >
            <Trash size={14} />
          </button>
        )}

        {/* Output Handle */}
        <NeonHandle
          type="source"
          position={Position.Top}
          id="output"
          isConnectable
          size={10}
          color1="#00FFFF"
          glow={isHandleConnected("output", true)}
        />
      </div>
    </div>
  );
}
