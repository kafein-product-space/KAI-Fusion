import React, { useRef, useState } from "react";
import { useReactFlow, Handle, Position } from "@xyflow/react";
import { Play, Square, Trash } from "lucide-react";
import NeonHandle from "~/components/common/NeonHandle";

interface EndNodeProps {
  data: any;
  id: string;
  onExecute?: (id: string) => void;
  validationStatus?: "success" | "error" | null;
}

function EndNode({ data, id, onExecute, validationStatus }: EndNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  // modalRef ve modal ile ilgili kodlar kaldırıldı

  // Get onExecute from data if not provided as prop
  const executeHandler = onExecute || data?.onExecute;
  const validationState = validationStatus || data?.validationStatus;

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
    <>
      {/* Ana node kutusu */}
      <div
        className={`w-18 h-18 rounded-tr-2xl rounded-br-2xl flex items-center justify-center gap-3 border-2 text-gray-700 font-medium cursor-pointer transition-all
          ${
            validationState === "success"
              ? "border-green-500"
              : validationState === "error"
              ? "border-red-500"
              : "border-gray-400"
          }
          bg-gray-100 hover:bg-gray-200`}
        onDoubleClick={() => executeHandler?.(id)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Çift tıklayarak çalıştır"
      >
        <div className=" rounded-2xl">
          <Square size={25} />
        </div>
        {isHovered && (
          <button
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full border-2 border-white shadow-lg transition-all duration-200 hover:scale-110 flex items-center justify-center z-10"
            onClick={handleDeleteNode}
            title="Delete Node"
          >
            <Trash size={8} />
          </button>
        )}
        <div
          className="absolute text-xs text-gray-600 font-medium pointer-events-none whitespace-nowrap"
          style={{
            bottom: "-30%",
            transform: "translateY(-50%)",
          }}
        >
          End
        </div>

        <NeonHandle
          type="target"
          position={Position.Left}
          id="output"
          isConnectable={true}
          size={10}
          color1="#00FFFF"
          glow={isHandleConnected}
        />
      </div>
    </>
  );
}

export default EndNode;
