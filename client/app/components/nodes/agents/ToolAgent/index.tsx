// index.tsx
import React, { useState, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import ToolAgentConfigForm from "./ToolAgentConfigForm";
import ToolAgentVisual from "./ToolAgentVisual";
import type { ToolAgentData, ToolAgentNodeProps } from "./types";

export default function ToolAgentNode({ data, id }: ToolAgentNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [configData, setConfigData] = useState<ToolAgentData>(data);
  const edges = getEdges?.() ?? [];

  const handleSaveConfig = (values: Partial<ToolAgentData>) => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...values } } : node
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
  const validate = (values: Partial<ToolAgentData>) => {
    const errors: any = {};
    if (!values.agent_type) {
      errors.agent_type = "Agent type is required";
    }
    if (!values.system_prompt) {
      errors.system_prompt = "System prompt is required";
    }
    if (
      !values.max_iterations ||
      values.max_iterations < 1 ||
      values.max_iterations > 20
    ) {
      errors.max_iterations = "Max iterations must be between 1 and 20";
    }
    if (
      !values.temperature ||
      values.temperature < 0 ||
      values.temperature > 2
    ) {
      errors.temperature = "Temperature must be between 0 and 2";
    }
    return errors;
  };

  if (isConfigMode) {
    return (
      <ToolAgentConfigForm
        initialValues={{
          agent_type: configData.agent_type || "react",
          system_prompt:
            configData.system_prompt ||
            "You are a helpful assistant. Use tools to answer: {input}",
          max_iterations: configData.max_iterations || 5,
          temperature: configData.temperature || 0.7,
          enable_memory: configData.enable_memory ?? true,
          enable_tools: configData.enable_tools ?? true,
        }}
        validate={validate}
        onSubmit={handleSaveConfig}
        onCancel={() => setIsConfigMode(false)}
      />
    );
  }

  return (
    <ToolAgentVisual
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
