// OpenAIEmbeddingsNode/EmbeddingsDisplay.tsx
import { Brain, Settings } from "lucide-react";
import NeonHandle from "~/components/common/NeonHandle";
import { Position } from "@xyflow/react";

export default function EmbeddingsDisplay({
  data,
  isHovered,
  onDoubleClick,
  onHoverEnter,
  onHoverLeave,
  isHandleConnected,
}: {
  data: any;
  isHovered: boolean;
  onDoubleClick: () => void;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
  isHandleConnected: (handleId: string, isSource?: boolean) => boolean;
}) {
  return (
    <div
      className={`relative group w-24 h-24 rounded-2xl flex flex-col items-center justify-center
        cursor-pointer transition-all duration-300 transform
        ${
          isHovered
            ? "scale-105 shadow-2xl shadow-purple-500/30"
            : "scale-100 shadow-lg shadow-black/50"
        }
        bg-gradient-to-br from-purple-500 to-pink-600 border border-white/20 backdrop-blur-sm`}
      onDoubleClick={onDoubleClick}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      {/* Icon, label, handle */}
      <div className="relative z-10 mb-2">
        <div className="relative">
          <Brain className="w-10 h-10 text-white drop-shadow-lg" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
            <Settings className="w-2 h-2 text-white" />
          </div>
        </div>
      </div>
      <div className="text-white text-xs font-semibold text-center drop-shadow-lg z-10">
        {data?.displayName || data?.name || "Embeddings"}
      </div>
      <NeonHandle
        type="source"
        position={Position.Right}
        id="output"
        isConnectable={true}
        size={10}
        color1="#00FFFF"
        glow={isHandleConnected("output", true)}
      />
    </div>
  );
}
