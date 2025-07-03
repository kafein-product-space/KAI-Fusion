import React, { useState } from "react";
import { Handle, Position } from "reactflow";
import { Play } from "lucide-react";

interface StartNodeProps {
  data: any;
}

function StartNode({ data }: StartNodeProps) {
  return (
    <div className="flex items-center gap-2 px-6 py-4 rounded-2xl border-2 border-green-400 bg-green-100 text-gray-700 font-medium hover:bg-green-200">
      <div className="bg-green-400 p-3 rounded-lg">
        <Play className="w-6 h-6 text-white" />
      </div>
      <p>Start</p>
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!bg-teal-500 h-16"
      />
    </div>
  );
}

export default StartNode;
