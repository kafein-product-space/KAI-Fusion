// index.tsx
import React, { useState, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import VectorStoreOrchestratorConfigForm from "./VectorStoreOrchestratorConfigForm";
import VectorStoreOrchestratorVisual from "./VectorStoreOrchestratorVisual";
import type {
  VectorStoreOrchestratorData,
  VectorStoreOrchestratorNodeProps,
} from "./types";

export default function VectorStoreOrchestratorNode({
  data,
  id,
}: VectorStoreOrchestratorNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [configData, setConfigData] =
    useState<VectorStoreOrchestratorData>(data);
  const edges = getEdges?.() ?? [];

  const handleSaveConfig = (values: Partial<VectorStoreOrchestratorData>) => {
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
  const validate = (values: Partial<VectorStoreOrchestratorData>) => {
    const errors: any = {};
    if (!values.connection_string) {
      errors.connection_string = "Connection string is required";
    }
    if (!values.collection_name) {
      errors.collection_name = "Collection name is required";
    }
    if (!values.search_algorithm) {
      errors.search_algorithm = "Search algorithm is required";
    }
    if (!values.search_k || values.search_k < 1 || values.search_k > 50) {
      errors.search_k = "Search K must be between 1 and 50";
    }
    if (
      !values.score_threshold ||
      values.score_threshold < 0 ||
      values.score_threshold > 1
    ) {
      errors.score_threshold = "Score threshold must be between 0 and 1";
    }
    if (
      !values.batch_size ||
      values.batch_size < 10 ||
      values.batch_size > 1000
    ) {
      errors.batch_size = "Batch size must be between 10 and 1000";
    }
    return errors;
  };

  if (isConfigMode) {
    return (
      <VectorStoreOrchestratorConfigForm
        initialValues={{
          connection_string: configData.connection_string || "",
          collection_name: configData.collection_name || "",
          pre_delete_collection: configData.pre_delete_collection || false,
          search_algorithm: configData.search_algorithm || "cosine",
          search_k: configData.search_k || 6,
          score_threshold: configData.score_threshold || 0.0,
          batch_size: configData.batch_size || 100,
          enable_hnsw_index: configData.enable_hnsw_index !== false,
        }}
        validate={validate}
        onSubmit={handleSaveConfig}
        onCancel={() => setIsConfigMode(false)}
      />
    );
  }

  return (
    <VectorStoreOrchestratorVisual
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
