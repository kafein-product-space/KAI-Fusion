// index.tsx
import React, { useState, useCallback, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import TavilyWebSearchConfigForm from "./TavilyWebSearchConfigForm";
import TavilyWebSearchVisual from "./TavilyWebSearchVisual";
import type { TavilyWebSearchData, TavilyWebSearchNodeProps } from "./types";

export default function TavilyWebSearchNode({
  data,
  id,
}: TavilyWebSearchNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [configData, setConfigData] = useState<TavilyWebSearchData>(data);
  const edges = getEdges?.() ?? [];

  // Update configData when data prop changes
  useEffect(() => {
    setConfigData(data);
  }, [data]);

  const handleSaveConfig = (values: Partial<TavilyWebSearchData>) => {
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
  const validate = (values: Partial<TavilyWebSearchData>) => {
    const errors: any = {};
    if (!values.search_type) {
      errors.search_type = "Search type is required";
    }
    if (!values.tavily_api_key) {
      errors.tavily_api_key = "API key is required";
    }
    if (
      !values.max_results ||
      values.max_results < 1 ||
      values.max_results > 20
    ) {
      errors.max_results = "Max results must be between 1 and 20";
    }
    if (!values.search_depth) {
      errors.search_depth = "Search depth is required";
    }
    return errors;
  };

  if (isConfigMode) {
    return (
      <TavilyWebSearchConfigForm
        initialValues={{
          search_type: configData.search_type || "basic",
          tavily_api_key: configData.tavily_api_key || "",
          credential_id: configData.credential_id || "",
          max_results: configData.max_results || 10,
          search_depth: configData.search_depth || "basic",
          include_answer: configData.include_answer || false,
          include_raw_content: configData.include_raw_content || false,
          include_images: configData.include_images || false,
        }}
        validate={validate}
        onSubmit={handleSaveConfig}
        onCancel={() => setIsConfigMode(false)}
      />
    );
  }

  return (
    <TavilyWebSearchVisual
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
