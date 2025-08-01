// index.tsx
import React, { useState, useCallback, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import CohereRerankerConfigForm from "./CohereRerankerConfigForm";
import CohereRerankerVisual from "./CohereRerankerVisual";
import type { CohereRerankerData, CohereRerankerNodeProps } from "./types";

export default function CohereRerankerNode({
  data,
  id,
}: CohereRerankerNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [configData, setConfigData] = useState<CohereRerankerData>(data);
  const edges = getEdges?.() ?? [];

  // Update configData when data prop changes
  useEffect(() => {
    setConfigData(data);
  }, [data]);

  const handleSaveConfig = (values: Partial<CohereRerankerData>) => {
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
  const validate = (values: Partial<CohereRerankerData>) => {
    const errors: any = {};
    if (!values.cohere_api_key) {
      errors.cohere_api_key = "API key is required";
    }
    if (!values.model) {
      errors.model = "Model is required";
    }
    if (!values.top_n || values.top_n < 1 || values.top_n > 20) {
      errors.top_n = "Top N must be between 1 and 20";
    }
    if (
      !values.max_chunks_per_doc ||
      values.max_chunks_per_doc < 1 ||
      values.max_chunks_per_doc > 50
    ) {
      errors.max_chunks_per_doc = "Max chunks per doc must be between 1 and 50";
    }
    return errors;
  };

  if (isConfigMode) {
    return (
      <CohereRerankerConfigForm
        initialValues={{
          cohere_api_key: configData.cohere_api_key || "",
          credential_id: configData.credential_id || "",
          model: configData.model || "rerank-english-v3.0",
          top_n: configData.top_n || 5,
          max_chunks_per_doc: configData.max_chunks_per_doc || 10,
        }}
        validate={validate}
        onSubmit={handleSaveConfig}
        onCancel={() => setIsConfigMode(false)}
      />
    );
  }

  return (
    <CohereRerankerVisual
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
