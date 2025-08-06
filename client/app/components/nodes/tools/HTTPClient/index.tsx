import React, { useState, useCallback, useEffect } from "react";
import { useReactFlow } from "@xyflow/react";
import { useSnackbar } from "notistack";
import HTTPClientVisual from "./HTTPClientVisual";
import HTTPClientConfigForm from "./HTTPClientConfigForm";
import {
  type HTTPClientNodeProps,
  type HTTPResponse,
  type HTTPStats,
  type HTTPClientConfig,
} from "./types";

export default function HTTPClientNode({ data, id }: HTTPClientNodeProps) {
  const { setNodes, getEdges } = useReactFlow();
  const { enqueueSnackbar } = useSnackbar();
  const [isHovered, setIsHovered] = useState(false);
  const [isConfigMode, setIsConfigMode] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResponse, setTestResponse] = useState<HTTPResponse | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testStats, setTestStats] = useState<any>(null);
  const [stats, setStats] = useState<HTTPStats | null>(null);
  const [configData, setConfigData] = useState<HTTPClientConfig>({
    url: data.url || "",
    method: data.method || "GET",
    headers: data.headers || {},
    body: data.body || "",
    timeout: data.timeout || 30,
    retry_count: data.retry_count || 3,
    retry_delay: data.retry_delay || 1000,
    follow_redirects: data.follow_redirects ?? true,
    verify_ssl: data.verify_ssl ?? true,
    proxy_url: data.proxy_url || "",
    auth_username: data.auth_username || "",
    auth_password: data.auth_password || "",
    api_key_header: data.api_key_header || "",
    api_key_value: data.api_key_value || "",
    content_type: data.content_type || "application/json",
    response_format: data.response_format || "json",
    success_status_codes: data.success_status_codes || "200,201,202",
    error_handling: data.error_handling || "raise",
    rate_limit_enabled: data.rate_limit_enabled ?? false,
    rate_limit_requests: data.rate_limit_requests || 100,
    rate_limit_window: data.rate_limit_window || 60,
    connection_timeout: data.connection_timeout || 10,
    read_timeout: data.read_timeout || 30,
    max_redirects: data.max_redirects || 5,
    retry_exponential_backoff: data.retry_exponential_backoff ?? false,
    retry_on_status_codes: data.retry_on_status_codes || "500,502,503,504",
    ssl_cert_path: data.ssl_cert_path || "",
    ssl_key_path: data.ssl_key_path || "",
    ssl_ca_path: data.ssl_ca_path || "",
    compression_enabled: data.compression_enabled ?? false,
    response_filter: data.response_filter || "",
    connection_pooling: data.connection_pooling ?? false,
    max_connections: data.max_connections || 10,
    keep_alive: data.keep_alive ?? true,
    custom_headers: data.custom_headers || "",
    query_params: data.query_params || "",
    form_data: data.form_data || "",
    multipart_enabled: data.multipart_enabled ?? false,
    file_upload_path: data.file_upload_path || "",
    file_upload_field: data.file_upload_field || "",
    response_validation: data.response_validation || "",
    timeout_handling: data.timeout_handling || "raise",
    circuit_breaker_enabled: data.circuit_breaker_enabled ?? false,
    circuit_breaker_threshold: data.circuit_breaker_threshold || 5,
    circuit_breaker_timeout: data.circuit_breaker_timeout || 60,
    logging_enabled: data.logging_enabled ?? false,
    debug_mode: data.debug_mode ?? false,
  });

  const sendTestRequest = useCallback(async () => {
    if (!configData.url) {
      setTestError("URL is required for testing");
      return;
    }

    setIsTesting(true);
    setTestError(null);
    setTestResponse(null);
    setTestStats(null);

    try {
      const startTime = Date.now();

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": configData.content_type || "application/json",
      };

      // Add custom headers
      if (configData.custom_headers) {
        try {
          const customHeaders = JSON.parse(configData.custom_headers);
          Object.assign(headers, customHeaders);
        } catch (e) {
          console.warn("Failed to parse custom headers:", e);
        }
      }

      // Add API key if configured
      if (configData.api_key_header && configData.api_key_value) {
        headers[configData.api_key_header] = configData.api_key_value;
      }

      // Prepare request options
      const requestOptions: RequestInit = {
        method: configData.method || "GET",
        headers,
      };

      // Add body for methods that support it
      if (
        ["POST", "PUT", "PATCH"].includes(configData.method || "GET") &&
        configData.body
      ) {
        requestOptions.body = configData.body;
      }

      // Add query parameters
      let url = configData.url;
      if (configData.query_params) {
        try {
          const queryParams = JSON.parse(configData.query_params);
          const searchParams = new URLSearchParams();
          Object.entries(queryParams).forEach(([key, value]) => {
            searchParams.append(key, String(value));
          });
          url += `?${searchParams.toString()}`;
        } catch (e) {
          console.warn("Failed to parse query parameters:", e);
        }
      }

      // Send request
      const response = await fetch(url, requestOptions);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Parse response
      let responseData;
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const result: HTTPResponse = {
        status_code: response.status,
        content: responseData,
        headers: responseHeaders,
        success: response.ok,
      };

      setTestResponse(result);
      setTestStats({
        duration_ms: duration,
        response_size: JSON.stringify(result).length,
        timestamp: new Date().toISOString(),
      });

      if (!response.ok) {
        setTestError(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Test request failed:", error);
      setTestError(error instanceof Error ? error.message : "Request failed");
    } finally {
      setIsTesting(false);
    }
  }, [configData]);

  const copyToClipboard = useCallback(
    async (text: string, type: string) => {
      try {
        await navigator.clipboard.writeText(text);
        enqueueSnackbar(`${type} copied to clipboard`, {
          variant: "success",
          autoHideDuration: 2000,
        });
      } catch (err) {
        console.error("Failed to copy:", err);
        enqueueSnackbar("Failed to copy to clipboard", {
          variant: "error",
          autoHideDuration: 2000,
        });
      }
    },
    [enqueueSnackbar]
  );

  const generateCurlCommand = useCallback(() => {
    if (!configData.url) return "";

    let curl = `curl -X ${configData.method || "GET"}`;

    // Add headers
    if (configData.content_type) {
      curl += ` -H "Content-Type: ${configData.content_type}"`;
    }

    if (configData.api_key_header && configData.api_key_value) {
      curl += ` -H "${configData.api_key_header}: ${configData.api_key_value}"`;
    }

    // Add custom headers
    if (configData.custom_headers) {
      try {
        const customHeaders = JSON.parse(configData.custom_headers);
        Object.entries(customHeaders).forEach(([key, value]) => {
          curl += ` -H "${key}: ${value}"`;
        });
      } catch (e) {
        console.warn("Failed to parse custom headers for cURL:", e);
      }
    }

    // Add body
    if (
      ["POST", "PUT", "PATCH"].includes(configData.method || "GET") &&
      configData.body
    ) {
      curl += ` -d '${configData.body}'`;
    }

    // Add URL
    curl += ` "${configData.url}"`;

    return curl;
  }, [configData]);

  const handleOpenConfig = useCallback(() => {
    setIsConfigMode(true);
  }, []);

  const handleDeleteNode = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setNodes((nodes) => nodes.filter((node) => node.id !== id));
      enqueueSnackbar("HTTP Client node deleted", {
        variant: "info",
        autoHideDuration: 2000,
      });
    },
    [setNodes, id, enqueueSnackbar]
  );

  const validate = (values: Partial<HTTPClientConfig>) => {
    const errors: any = {};
    if (!values.url) {
      errors.url = "URL is required";
    }
    if (values.timeout && values.timeout < 1) {
      errors.timeout = "Timeout must be at least 1 second";
    }
    if (values.retry_count && values.retry_count < 0) {
      errors.retry_count = "Retry count must be non-negative";
    }
    if (values.rate_limit_requests && values.rate_limit_requests < 1) {
      errors.rate_limit_requests = "Rate limit requests must be at least 1";
    }
    if (values.rate_limit_window && values.rate_limit_window < 1) {
      errors.rate_limit_window = "Rate limit window must be at least 1 second";
    }
    return errors;
  };

  const handleSaveConfig = useCallback(
    (values: Partial<HTTPClientConfig>) => {
      try {
        // Update the node data
        setNodes((nodes: any[]) =>
          nodes.map((node: any) =>
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
        enqueueSnackbar("HTTP Client configuration saved successfully!", {
          variant: "success",
          autoHideDuration: 3000,
        });
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
  }, []);

  const isHandleConnected = (handleId: string, isSource = false) =>
    getEdges().some((edge) =>
      isSource
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId
    );

  if (isConfigMode) {
    return (
      <HTTPClientConfigForm
        configData={configData}
        onSave={handleSaveConfig}
        onCancel={handleCancel}
        isTesting={isTesting}
        testResponse={testResponse}
        testError={testError}
        testStats={testStats}
        onSendTestRequest={sendTestRequest}
        onCopyToClipboard={copyToClipboard}
        generateCurlCommand={generateCurlCommand}
      />
    );
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <HTTPClientVisual
        data={data}
        isSelected={false}
        isHovered={isHovered}
        onDoubleClick={() => setIsConfigMode(true)}
        onOpenConfig={handleOpenConfig}
        onDeleteNode={handleDeleteNode}
        onSendTestRequest={sendTestRequest}
        onCopyToClipboard={copyToClipboard}
        generateCurlCommand={generateCurlCommand}
        isTesting={isTesting}
        testResponse={testResponse}
        testError={testError}
        testStats={testStats}
        isHandleConnected={isHandleConnected}
      />
    </div>
  );
}
