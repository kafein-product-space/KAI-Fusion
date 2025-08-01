// index.tsx
import React, { useState, useCallback, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import DocumentChunkSplitterConfigForm from "./DocumentChunkSplitterConfigForm";
import DocumentChunkSplitterVisual from "./DocumentChunkSplitterVisual";
import type {
  DocumentChunkSplitterData,
  DocumentChunkSplitterNodeProps,
} from "./types";

export default function DocumentChunkSplitterNode({
  data,
  id,
}: DocumentChunkSplitterNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [configData, setConfigData] = useState<DocumentChunkSplitterData>(data);
  const edges = getEdges?.() ?? [];

  // Update configData when data prop changes
  useEffect(() => {
    setConfigData(data);
  }, [data]);

  const handleSaveConfig = (values: Partial<DocumentChunkSplitterData>) => {
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
  const validate = (values: Partial<DocumentChunkSplitterData>) => {
    const errors: any = {};
    if (!values.chunkSize) {
      errors.chunkSize = "Chunk size is required";
    } else if (values.chunkSize < 100 || values.chunkSize > 10000) {
      errors.chunkSize = "Chunk size must be between 100 and 10000";
    }
    if (
      values.overlap !== undefined &&
      (values.overlap < 0 || values.overlap > 5000)
    ) {
      errors.overlap = "Overlap must be between 0 and 5000";
    }
    if (
      values.overlap !== undefined &&
      values.chunkSize &&
      values.overlap >= values.chunkSize
    ) {
      errors.overlap = "Overlap must be less than chunk size";
    }
    if (!values.separator) {
      errors.separator = "Separator is required";
    }
    if (
      values.lengthFunction &&
      !["len", "tokenizer", "custom"].includes(values.lengthFunction)
    ) {
      errors.lengthFunction = "Invalid length function";
    }
    return errors;
  };

  if (isConfigMode) {
    return (
      <DocumentChunkSplitterConfigForm
        initialValues={{
          chunkSize: configData.chunkSize || 1000,
          overlap: configData.overlap || 200,
          separator: configData.separator || "\\n\\n",
          keepSeparator:
            configData.keepSeparator !== undefined
              ? configData.keepSeparator
              : false,
          lengthFunction: configData.lengthFunction || "len",
          isSeparatorRegex:
            configData.isSeparatorRegex !== undefined
              ? configData.isSeparatorRegex
              : false,
        }}
        validate={validate}
        onSubmit={handleSaveConfig}
        onCancel={() => setIsConfigMode(false)}
      />
    );
  }

  return (
    <DocumentChunkSplitterVisual
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
