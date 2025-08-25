import {
  MessageSquare,
  Trash,
  Sparkles,
  Brain,
  Activity,
  Zap,
} from "lucide-react";
import NeonHandle from "~/components/common/NeonHandle";
import { Position } from "@xyflow/react";

interface Props {
  data: any;
  isHovered: boolean;
  onDoubleClick: () => void;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isHandleConnected: (handleId: string, isSource?: boolean) => boolean;
  getStatusColor: () => string;
  getGlowColor: () => string;
  isActive?: boolean;
}

export default function ChatDisplayNode({
  data,
  isHovered,
  onDoubleClick,
  onHoverEnter,
  onHoverLeave,
  onDelete,
  isHandleConnected,
  getStatusColor,
  getGlowColor,
  isActive,
}: Props) {
  return (
    <div className="relative group">
      <div
        className={`relative w-24 h-24 rounded-2xl flex flex-col items-center justify-center
          cursor-pointer transition-all duration-300 transform
          ${isHovered ? "scale-105" : "scale-100"}
          bg-gradient-to-br ${getStatusColor()}
          ${
            isHovered
              ? `shadow-2xl ${getGlowColor()}`
              : "shadow-lg shadow-black/50"
          }
          border border-white/20 backdrop-blur-sm hover:border-white/40
          ${isActive ? "animate-pulse ring-4 ring-green-400/50" : ""}`}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDoubleClick();
        }}
        onMouseEnter={(e) => {
          onHoverEnter();
        }}
        onMouseLeave={(e) => {
          onHoverLeave();
        }}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent opacity-50" />
        <div className="relative z-10 mb-2">
          <div className="relative">
            <img
              src="icons/openai.svg"
              alt="openaiicons"
              className="w-10 h-10 text-white"
            />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-2 h-2 text-white" />
            </div>
          </div>
        </div>
        <div className="text-white text-xs font-semibold text-center z-10">
          {data?.displayName || data?.name || "OpenAI Chat"}
        </div>

        {isHovered && (
          <button
            onClick={onDelete}
            className="absolute -top-3 -right-3 w-8 h-8 bg-red-600 text-white rounded-full border shadow-xl flex items-center justify-center"
          >
            <Trash size={14} />
          </button>
        )}

        <NeonHandle
          type="source"
          position={Position.Top}
          id="output"
          isConnectable={true}
          size={10}
          color1="#00FFFF"
          glow={isHandleConnected("output", true)}
        />
      </div>
    </div>
  );
}
