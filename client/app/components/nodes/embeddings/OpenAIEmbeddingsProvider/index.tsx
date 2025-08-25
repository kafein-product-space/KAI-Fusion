// index.tsx
import React, { useState, useCallback, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import OpenAIEmbeddingsProviderConfigForm from "./OpenAIEmbeddingsProviderConfigForm";
import OpenAIEmbeddingsProviderVisual from "./OpenAIEmbeddingsProviderVisual";
import type {
  OpenAIEmbeddingsProviderData,
  OpenAIEmbeddingsProviderNodeProps,
} from "./types";

export default function OpenAIEmbeddingsProviderNode({
  data,
  id,
}: OpenAIEmbeddingsProviderNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [configData, setConfigData] =
    useState<OpenAIEmbeddingsProviderData>(data);
  const edges = getEdges?.() ?? [];

  // Update configData when data prop changes
  useEffect(() => {
    setConfigData(data);
  }, [data]);

  const handleSaveConfig = (values: Partial<OpenAIEmbeddingsProviderData>) => {
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

  // Get dimensions based on model
  const getDimensionsForModel = (model: string) => {
    switch (model) {
      case "text-embedding-3-large":
        return 3072;
      case "text-embedding-3-small":
      case "text-embedding-ada-002":
      default:
        return 1536;
    }
  };

  // Validation function
  const validate = (values: Partial<OpenAIEmbeddingsProviderData>) => {
    const errors: any = {};
    if (!values.model) {
      errors.model = "Model is required";
    }
    // Only validate API key if it's not empty (allow empty for initial state)
    if (values.openai_api_key && values.openai_api_key.trim() === "") {
      errors.openai_api_key = "API key is required";
    }
    if (
      values.batch_size &&
      (values.batch_size < 1 || values.batch_size > 100)
    ) {
      errors.batch_size = "Batch size must be between 1 and 100";
    }
    if (
      values.max_retries &&
      (values.max_retries < 0 || values.max_retries > 10)
    ) {
      errors.max_retries = "Max retries must be between 0 and 10";
    }
    if (
      values.request_timeout &&
      (values.request_timeout < 10 || values.request_timeout > 300)
    ) {
      errors.request_timeout =
        "Request timeout must be between 10 and 300 seconds";
    }
    return errors;
  };

  if (isConfigMode) {
    const dimensions = getDimensionsForModel(
      configData.model || "text-embedding-3-small"
    );

    return (
      <OpenAIEmbeddingsProviderConfigForm
        initialValues={{
          model: configData.model || "text-embedding-3-small",
          openai_api_key: configData.openai_api_key || "",
          credential_id: configData.credential_id || "",
          organization: configData.organization || "",
          batch_size: configData.batch_size || 20,
          max_retries: configData.max_retries || 3,
          request_timeout: configData.request_timeout || 60,
          dimensions: dimensions,
        }}
        validate={validate}
        onSubmit={handleSaveConfig}
        onCancel={() => setIsConfigMode(false)}
      />
    );
  }

  return (
    <OpenAIEmbeddingsProviderVisual
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
