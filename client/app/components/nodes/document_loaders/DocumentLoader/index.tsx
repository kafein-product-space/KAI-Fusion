// index.tsx
import React, { useState, useCallback, useEffect } from "react";
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
  const edges = getEdges?.() ?? [];

  // Update config data when node data changes
  useEffect(() => {
    // This ensures we always have the latest data
  }, [data]);

  const handleSaveConfig = (values: Partial<DocumentLoaderData>) => {
    console.log("Saving DocumentLoader config:", values);
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

  // Enhanced validation function for Google Drive
  const validate = (values: Partial<DocumentLoaderData>) => {
    const errors: any = {};

    // Google Drive links validation
    if (!values.drive_links || values.drive_links.trim() === "") {
      errors.drive_links = "Google Drive links are required";
    } else {
      const links = values.drive_links
        .trim()
        .split("\n")
        .filter((link) => link.trim());
      if (links.length === 0) {
        errors.drive_links = "At least one valid Google Drive link is required";
      } else {
        // Validate Google Drive link format
        for (const link of links) {
          const trimmedLink = link.trim();
          if (
            !trimmedLink.includes("drive.google.com") &&
            !trimmedLink.includes("docs.google.com")
          ) {
            errors.drive_links = "Invalid Google Drive link format";
            break;
          }
        }
      }
    }

    // Authentication validation
    const authType = values.google_drive_auth_type || "service_account";

    if (authType === "service_account") {
      if (
        !values.service_account_json ||
        values.service_account_json.trim() === ""
      ) {
        errors.service_account_json = "Service account JSON is required";
      } else {
        try {
          JSON.parse(values.service_account_json);
        } catch (e) {
          errors.service_account_json =
            "Invalid JSON format for service account credentials";
        }
      }
    } else if (authType === "oauth2") {
      if (!values.oauth2_client_id || values.oauth2_client_id.trim() === "") {
        errors.oauth2_client_id = "OAuth2 Client ID is required";
      }
      if (
        !values.oauth2_client_secret ||
        values.oauth2_client_secret.trim() === ""
      ) {
        errors.oauth2_client_secret = "OAuth2 Client Secret is required";
      }
      if (
        !values.oauth2_refresh_token ||
        values.oauth2_refresh_token.trim() === ""
      ) {
        errors.oauth2_refresh_token = "OAuth2 Refresh Token is required";
      }
    }

    // Format validation
    if (!values.supported_formats || values.supported_formats.length === 0) {
      errors.supported_formats = "At least one format must be selected";
    }

    // Processing options validation
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
    const initialValues = {
      drive_links: data.drive_links || "",
      google_drive_auth_type: data.google_drive_auth_type || "service_account",
      service_account_json: data.service_account_json || "",
      oauth2_client_id: data.oauth2_client_id || "",
      oauth2_client_secret: data.oauth2_client_secret || "",
      oauth2_refresh_token: data.oauth2_refresh_token || "",
      supported_formats: data.supported_formats || [
        "txt",
        "json",
        "docx",
        "pdf",
        "csv",
      ],
      min_content_length: data.min_content_length || 50,
      max_file_size_mb: data.max_file_size_mb || 50,
      storage_enabled: data.storage_enabled || false,
      deduplicate: data.deduplicate !== false,
      quality_threshold: data.quality_threshold || 0.5,
    };

    console.log("DocumentLoader initial values:", initialValues);

    return (
      <DocumentLoaderConfigForm
        initialValues={initialValues}
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
