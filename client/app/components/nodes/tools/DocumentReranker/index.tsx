// index.tsx
import React, { useState, useCallback, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import DocumentRerankerConfigForm from "./DocumentRerankerConfigForm";
import DocumentRerankerVisual from "./DocumentRerankerVisual";
import type { DocumentRerankerData, DocumentRerankerNodeProps } from "./types";

export default function DocumentRerankerNode({
  data,
  id,
}: DocumentRerankerNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [configData, setConfigData] = useState<DocumentRerankerData>(data);
  const edges = getEdges?.() ?? [];

  // Update configData when data prop changes
  useEffect(() => {
    setConfigData(data);
  }, [data]);

  const handleSaveConfig = (values: Partial<DocumentRerankerData>) => {
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
  const validate = (values: Partial<DocumentRerankerData>) => {
    const errors: any = {};
    if (!values.rerank_strategy) {
      errors.rerank_strategy = "Rerank strategy is required";
    }
    if (!values.cohere_api_key) {
      errors.cohere_api_key = "API key is required";
    }
    if (!values.initial_k || values.initial_k < 1 || values.initial_k > 100) {
      errors.initial_k = "Initial K must be between 1 and 100";
    }
    if (!values.final_k || values.final_k < 1 || values.final_k > 50) {
      errors.final_k = "Final K must be between 1 and 50";
    }
    if (
      values.initial_k &&
      values.final_k &&
      values.initial_k < values.final_k
    ) {
      errors.final_k = "Final K must be less than or equal to Initial K";
    }
    if (
      values.rerank_strategy === "hybrid" &&
      (!values.hybrid_alpha ||
        values.hybrid_alpha < 0 ||
        values.hybrid_alpha > 1)
    ) {
      errors.hybrid_alpha = "Hybrid alpha must be between 0 and 1";
    }
    if (
      !values.similarity_threshold ||
      values.similarity_threshold < 0 ||
      values.similarity_threshold > 1
    ) {
      errors.similarity_threshold =
        "Similarity threshold must be between 0 and 1";
    }
    return errors;
  };

  if (isConfigMode) {
    return (
      <DocumentRerankerConfigForm
        initialValues={{
          rerank_strategy: configData.rerank_strategy || "cohere",
          cohere_api_key: configData.cohere_api_key || "",
          credential_id: configData.credential_id || "",
          initial_k: configData.initial_k || 10,
          final_k: configData.final_k || 5,
          hybrid_alpha: configData.hybrid_alpha || 0.5,
          enable_caching: configData.enable_caching || false,
          similarity_threshold: configData.similarity_threshold || 0.7,
        }}
        validate={validate}
        onSubmit={handleSaveConfig}
        onCancel={() => setIsConfigMode(false)}
      />
    );
  }

  return (
    <DocumentRerankerVisual
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
