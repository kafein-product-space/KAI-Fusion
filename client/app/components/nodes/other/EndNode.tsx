import React from "react";
import { Handle, Position } from "@xyflow/react";
import { Goal } from "lucide-react";

interface EndNodeProps {
  data: {
    displayName?: string;
  };
}

function EndNode({ data }: EndNodeProps) {
  return (
    <div
      className="flex items-center justify-center px-6 py-4 rounded-full border-2 text-gray-700 font-semibold cursor-pointer transition-all border-red-400 bg-red-100 shadow-md min-w-[120px] min-h-[50px]"
      title="Workflow End"
    >
      <div className="flex items-center gap-2">
        <Goal className="w-6 h-6 text-red-600" />
        <p className="text-lg text-red-800">{data.displayName || "End"}</p>
      </div>

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-4 h-4 border-2 border-white !bg-red-500"
        style={{
          width: 12,
          height: 12,
          left: "-7px",
        }}
        title="End Input"
      />
    </div>
  );
}

export default EndNode;
