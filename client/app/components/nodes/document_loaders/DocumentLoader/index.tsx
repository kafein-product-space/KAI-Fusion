// index.tsx
import React, { useState, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import DocumentLoaderConfigForm from "./DocumentLoaderConfigForm";
import DocumentLoaderVisual from "./DocumentLoaderVisual";
import type { DocumentLoaderData, DocumentLoaderNodeProps } from "./types";

export default function DocumentLoaderNode({
  data,
  id,
}: DocumentLoaderNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [configData, setConfigData] = useState<DocumentLoaderData>(data);
  const edges = getEdges?.() ?? [];

  const handleSaveConfig = (values: Partial<DocumentLoaderData>) => {
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
  const validate = (values: Partial<DocumentLoaderData>) => {
    const errors: any = {};

    // File paths validation is now handled by file upload component
    // We don't need to validate file_paths anymore since it's replaced with file upload

    if (!values.supported_formats || values.supported_formats.length === 0) {
      errors.supported_formats = "At least one format must be selected";
    }
    if (!values.min_content_length || values.min_content_length < 1) {
      errors.min_content_length = "Min content length must be at least 1";
    }
    if (!values.max_file_size_mb || values.max_file_size_mb < 1) {
      errors.max_file_size_mb = "Max file size must be at least 1MB";
    }
    if (
      !values.quality_threshold ||
      values.quality_threshold < 0 ||
      values.quality_threshold > 1
    ) {
      errors.quality_threshold = "Quality threshold must be between 0 and 1";
    }
    return errors;
  };

  if (isConfigMode) {
    return (
      <DocumentLoaderConfigForm
        initialValues={{
          file_paths: configData.file_paths || "",
          supported_formats: configData.supported_formats || [
            "txt",
            "json",
            "docx",
            "pdf",
          ],
          min_content_length: configData.min_content_length || 50,
          max_file_size_mb: configData.max_file_size_mb || 50,
          storage_enabled: configData.storage_enabled || false,
          deduplicate: configData.deduplicate !== false,
          quality_threshold: configData.quality_threshold || 0.5,
        }}
        validate={validate}
        onSubmit={handleSaveConfig}
        onCancel={() => setIsConfigMode(false)}
      />
    );
  }

  return (
    <DocumentLoaderVisual
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
