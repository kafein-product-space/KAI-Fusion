import React from "react";
import { Handle, Position } from "@xyflow/react";

const EndNode = ({ data }: { data: any }) => {
  return (
    <div
      style={{
        padding: 16,
        border: "2px solid #e74c3c",
        borderRadius: 8,
        background: "#fff0f0",
        minWidth: 120,
        textAlign: "center",
      }}
    >
      <div style={{ fontWeight: "bold", color: "#e74c3c" }}>End</div>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#e74c3c" }}
      />
    </div>
  );
};

export default EndNode;
