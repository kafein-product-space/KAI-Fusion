import React from "react";
import { Handle, Position } from "@xyflow/react";

interface GenericNodeProps {
  data: {
    display_name?: string;
    icon?: string;
    color?: string;
    inputs?: Array<{ name: string }>;
    outputs?: Array<{ name: string }>;
    [key: string]: any;
  };
}

const GenericNode: React.FC<GenericNodeProps> = ({ data }) => {
  const color = data.color || "#888";
  return (
    <div
      style={{
        border: `2px solid ${color}`,
        borderRadius: 10,
        background: "#fff",
        minWidth: 120,
        padding: 12,
        textAlign: "center",
        position: "relative",
      }}
    >
      {/* Icon veya ilk harf */}
      <div style={{ fontSize: 24, color, marginBottom: 4 }}>
        {data.icon ? (
          <span className={`icon-${data.icon}`} />
        ) : (
          (data.display_name || "N").charAt(0).toUpperCase()
        )}
      </div>
      {/* Node adı */}
      <div style={{ fontWeight: "bold", color }}>
        {data.display_name || "Node"}
      </div>
      {/* Inputs */}
      {data.inputs && data.inputs.length > 0 && (
        <div style={{ marginTop: 8, textAlign: "left" }}>
          <div style={{ fontSize: 12, color: "#666" }}>Inputs:</div>
          {data.inputs.map((input, idx) => (
            <div key={idx} style={{ fontSize: 12 }}>
              <Handle
                type="target"
                position={Position.Left}
                id={`input-${idx}`}
                style={{ background: color, top: 24 + idx * 18 }}
              />
              {input.name}
            </div>
          ))}
        </div>
      )}
      {/* Outputs */}
      {data.outputs && data.outputs.length > 0 && (
        <div style={{ marginTop: 8, textAlign: "left" }}>
          <div style={{ fontSize: 12, color: "#666" }}>Outputs:</div>
          {data.outputs.map((output, idx) => (
            <div key={idx} style={{ fontSize: 12 }}>
              <Handle
                type="source"
                position={Position.Right}
                id={`output-${idx}`}
                style={{ background: color, top: 24 + idx * 18 }}
              />
              {output.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GenericNode;
