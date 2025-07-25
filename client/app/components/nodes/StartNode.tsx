import React, { useRef, useState } from "react";
import { useReactFlow, Handle, Position } from "@xyflow/react";
import { Play, Trash } from "lucide-react";
import StartNodeConfigModal from "../modals/StartNodeConfigModal";
import NeonHandle from "../common/NeonHandle";

interface StartNodeProps {
  data: any;
  id: string;
  onExecute?: (id: string) => void;
  validationStatus?: "success" | "error" | null;
}

function StartNode({ data, id, onExecute, validationStatus }: StartNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  // modalRef ve modal ile ilgili kodlar kaldırıldı

  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };
  const edges = getEdges ? getEdges() : [];
  const isHandleConnected = edges.some(
    (edge) => edge.source === id && edge.sourceHandle === "output"
  );
  return (
    <>
      {/* Ana node kutusu */}
      <div
        className={`w-18 h-18 rounded-tl-2xl rounded-bl-2xl flex items-center  justify-center gap-3 border-2 border-gray-400 text-gray-700 font-medium cursor-pointer transition-all
         
          bg-gray-100 hover:bg-gray-200`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Çift tıklayarak çalıştır"
      >
        <div className=" rounded-2xl">
          <Play size={25} />
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
          Start
        </div>

        <NeonHandle
          type="source"
          position={Position.Right}
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

export default StartNode;
