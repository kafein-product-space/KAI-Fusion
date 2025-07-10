import React from "react";
import { Handle, Position } from "@xyflow/react";

interface GenericNodeProps {
  id: string;
  data: {
    name?: string;
  };
}

const GenericNode: React.FC<GenericNodeProps> = ({ data }) => {
  return (
    <div className="px-4 py-2 rounded-md border bg-white shadow-sm text-xs">
      {data.name || "Node"}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default GenericNode;
