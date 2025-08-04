// index.tsx
import React, { useState, useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useSnackbar } from "notistack";
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
  const { enqueueSnackbar } = useSnackbar();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [configData, setConfigData] =
    useState<VectorStoreOrchestratorData>(data);
  const edges = getEdges?.() ?? [];

  const handleSaveConfig = useCallback(
    (values: Partial<VectorStoreOrchestratorData>) => {
      console.log("handleSaveConfig called with values:", values);
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
        enqueueSnackbar(
          "Vector Store Orchestrator configuration saved successfully!",
          {
            variant: "success",
            autoHideDuration: 3000,
          }
        );
      } catch (error) {
        console.error("Error saving configuration:", error);
        enqueueSnackbar("Failed to save configuration. Please try again.", {
          variant: "error",
          autoHideDuration: 4000,
        });
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

  const isHandleConnected = (handleId: string, isSource = false) =>
    edges.some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );

  // Enhanced validation function
  const validate = (values: Partial<VectorStoreOrchestratorData>) => {
    console.log("Validating values:", values);
    const errors: any = {};

    // Required validations
    if (!values.connection_string || values.connection_string.trim() === "") {
      errors.connection_string = "Connection string is required";
    }
    if (!values.collection_name || values.collection_name.trim() === "") {
      errors.collection_name = "Collection name is required";
    }

    // Table prefix validation (optional but must be valid if provided)
    if (values.table_prefix && values.table_prefix.trim() !== "") {
      const prefixRegex = /^[a-zA-Z0-9_]+$/;
      if (!prefixRegex.test(values.table_prefix)) {
        errors.table_prefix =
          "Table prefix can only contain alphanumeric characters and underscores";
      }
    }

    // Custom metadata JSON validation
    if (values.custom_metadata && values.custom_metadata.trim() !== "") {
      try {
        JSON.parse(values.custom_metadata);
      } catch {
        errors.custom_metadata = "Custom metadata must be valid JSON format";
      }
    }

    // Metadata strategy validation
    if (
      values.metadata_strategy &&
      !["merge", "replace", "document_only"].includes(values.metadata_strategy)
    ) {
      errors.metadata_strategy = "Invalid metadata strategy";
    }

    // Optional validations with defaults
    if (
      values.search_k !== undefined &&
      (values.search_k < 1 || values.search_k > 50)
    ) {
      errors.search_k = "Search K must be between 1 and 50";
    }
    if (
      values.score_threshold !== undefined &&
      (values.score_threshold < 0 || values.score_threshold > 1)
    ) {
      errors.score_threshold = "Score threshold must be between 0 and 1";
    }
    if (
      values.batch_size !== undefined &&
      (values.batch_size < 10 || values.batch_size > 1000)
    ) {
      errors.batch_size = "Batch size must be between 10 and 1000";
    }

    console.log("Validation errors:", errors);
    return errors;
  };

  if (isConfigMode) {
    const initialFormValues = {
      connection_string: configData.connection_string || "",
      collection_name: configData.collection_name || "",
      table_prefix: configData.table_prefix || "",
      pre_delete_collection: configData.pre_delete_collection || false,
      search_algorithm: configData.search_algorithm || "cosine",
      search_k: configData.search_k || 6,
      score_threshold: configData.score_threshold || 0.0,
      batch_size: configData.batch_size || 100,
      enable_hnsw_index: configData.enable_hnsw_index !== false,
      // New metadata configuration
      custom_metadata: configData.custom_metadata || "{}",
      preserve_document_metadata:
        configData.preserve_document_metadata !== false,
      metadata_strategy: configData.metadata_strategy || "merge",
    };

    console.log("Opening config with initial values:", initialFormValues);

    return (
      <VectorStoreOrchestratorConfigForm
        initialValues={initialFormValues}
        validate={validate}
        onSubmit={handleSaveConfig}
        onCancel={handleCancel}
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
        enqueueSnackbar("Vector Store Orchestrator node deleted", {
          variant: "info",
          autoHideDuration: 2000,
        });
      }}
      isHandleConnected={isHandleConnected}
    />
  );
}
