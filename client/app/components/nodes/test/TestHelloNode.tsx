import React, { useRef, useState } from "react";
import { useReactFlow, Handle, Position } from "@xyflow/react";
import { TestTube, Trash } from "lucide-react";

interface TestHelloNodeProps {
  data: any;
  id: string;
}

function TestHelloNode({ data, id }: TestHelloNodeProps) {
  const { setNodes } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);

  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
  };

  return (
    <>
      {/* Ana node kutusu */}
      <div
        className={`flex items-center gap-3 px-4 py-4 rounded-2xl border-2 text-blue-700 font-medium cursor-pointer transition-all border-blue-400 bg-blue-100 hover:bg-blue-200`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="Test Hello Node"
      >
        <div className="bg-white p-1 rounded-2xl">
          <TestTube />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">
              {data?.displayName || data?.name || "Test Hello"}
            </p>
          </div>
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

        <Handle
          type="source"
          position={Position.Right}
          id="output"
          className="w-3 h-3 bg-blue-500"
        />
      </div>
    </>
  );
}

export default TestHelloNode; 