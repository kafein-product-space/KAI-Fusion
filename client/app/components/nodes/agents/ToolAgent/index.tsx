// index.tsx
import React, { useState, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useSnackbar } from "notistack";
import ToolAgentConfigForm from "./ToolAgentConfigForm";
import ToolAgentVisual from "./ToolAgentVisual";
import type { ToolAgentData, ToolAgentNodeProps } from "./types";

export default function ToolAgentNode({ data, id }: ToolAgentNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const { enqueueSnackbar } = useSnackbar();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [configData, setConfigData] = useState<ToolAgentData>(data);
  const edges = getEdges?.() ?? [];

  const handleSaveConfig = useCallback(
    (values: Partial<ToolAgentData>) => {
      try {
        // Update the node data
        setNodes((nodes) =>
          nodes.map((node) =>
            node.id === id
              ? { ...node, data: { ...node.data, ...values } }
              : node
          )
        );

        // Update local config data for persistence
        setConfigData((prev) => ({ ...prev, ...values }));

        // Close config mode
        setIsConfigMode(false);

        // Show success notification
        enqueueSnackbar("Agent configuration saved successfully!", {
          variant: "success",
          autoHideDuration: 3000,
        });
      } catch (error) {
        console.error("Error saving agent configuration:", error);
        enqueueSnackbar(
          "Failed to save agent configuration. Please try again.",
          {
            variant: "error",
            autoHideDuration: 4000,
          }
        );
      }
    },
    [setNodes, id, enqueueSnackbar]
  );

  const handleCancel = useCallback(() => {
    setIsConfigMode(false);
    enqueueSnackbar("Configuration cancelled", {
      variant: "info",
      autoHideDuration: 2000,
    });
  }, [enqueueSnackbar]);

  const handleDeleteNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
    enqueueSnackbar("Agent node deleted", {
      variant: "info",
      autoHideDuration: 2000,
    });
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
        onCancel={handleCancel}
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
      onDelete={handleDeleteNode}
      isHandleConnected={isHandleConnected}
    />
  );
}
