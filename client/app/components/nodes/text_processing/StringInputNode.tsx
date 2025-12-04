import React, { useState, useCallback, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import StringInputConfigForm from "./StringInputConfigForm";
import StringInputVisual from "./StringInputVisual";
import type { StringInputData, StringInputNodeProps } from "./types";

export default function StringInputNode({
  data,
  id,
}: StringInputNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [configData, setConfigData] = useState<StringInputData>(data);
  const edges = getEdges?.() ?? [];

  // Update configData when data prop changes
  useEffect(() => {
    setConfigData(data);
  }, [data]);

  const handleSaveConfig = (values: Partial<StringInputData>) => {
    const updatedData = { ...data, ...values };
    setConfigData(updatedData);
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: updatedData } : node
      )
    );
    setIsConfigMode(false);
  };

  const isHandleConnected = (handleId: string, isSource = false) =>
    edges.some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );

  // Validation function
  const validate = (values: Partial<StringInputData>) => {
    const errors: any = {};
    // Text input is not required since it can come from connected nodes
    if (values.text_input && values.text_input.length > 10000) {
      errors.text_input = "Text input must be 10,000 characters or less";
    }
    return errors;
  };

  if (isConfigMode) {
    return (
      <StringInputConfigForm
        initialValues={{
          text_input: configData.text_input || "",
        }}
        validate={validate}
        onSubmit={handleSaveConfig}
        onCancel={() => setIsConfigMode(false)}
      />
    );
  }

  return (
    <StringInputVisual
      data={data}
      isHovered={isHovered}
      onDoubleClick={() => setIsConfigMode(true)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDelete={(e) => {
        e.stopPropagation();
        setNodes((nodes) => nodes.filter((node) => node.id !== id));
      }}
      isHandleConnected={isHandleConnected}
    />
  );
}