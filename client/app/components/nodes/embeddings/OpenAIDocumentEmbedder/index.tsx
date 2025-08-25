// index.tsx
import React, { useState, useCallback, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import OpenAIDocumentEmbedderConfigForm from "./OpenAIDocumentEmbedderConfigForm";
import OpenAIDocumentEmbedderVisual from "./OpenAIDocumentEmbedderVisual";
import type {
  OpenAIDocumentEmbedderData,
  OpenAIDocumentEmbedderNodeProps,
} from "./types";

export default function OpenAIDocumentEmbedderNode({
  data,
  id,
}: OpenAIDocumentEmbedderNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [configData, setConfigData] =
    useState<OpenAIDocumentEmbedderData>(data);
  const edges = getEdges?.() ?? [];

  // Update configData when data prop changes
  useEffect(() => {
    setConfigData(data);
  }, [data]);

  const handleSaveConfig = (values: Partial<OpenAIDocumentEmbedderData>) => {
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
  const validate = (values: Partial<OpenAIDocumentEmbedderData>) => {
    const errors: any = {};
    if (!values.embedding_model) {
      errors.embedding_model = "Embedding model is required";
    }
    if (!values.api_key) {
      errors.api_key = "API key is required";
    }
    if (
      values.chunk_size &&
      (values.chunk_size < 100 || values.chunk_size > 4000)
    ) {
      errors.chunk_size = "Chunk size must be between 100 and 4000";
    }
    if (
      values.chunk_overlap &&
      (values.chunk_overlap < 0 || values.chunk_overlap > 2000)
    ) {
      errors.chunk_overlap = "Chunk overlap must be between 0 and 2000";
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
    return errors;
  };

  if (isConfigMode) {
    const dimensions = getDimensionsForModel(
      configData.embedding_model || "text-embedding-3-small"
    );

    return (
      <OpenAIDocumentEmbedderConfigForm
        initialValues={{
          embedding_model:
            configData.embedding_model || "text-embedding-3-small",
          api_key: configData.api_key || "",
          credential_id: configData.credential_id || "",
          organization: configData.organization || "",
          chunk_size: configData.chunk_size || 1000,
          chunk_overlap: configData.chunk_overlap || 200,
          batch_size: configData.batch_size || 20,
          max_retries: configData.max_retries || 3,
          embedding_dimensions: dimensions,
        }}
        validate={validate}
        onSubmit={handleSaveConfig}
        onCancel={() => setIsConfigMode(false)}
      />
    );
  }

  return (
    <OpenAIDocumentEmbedderVisual
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
