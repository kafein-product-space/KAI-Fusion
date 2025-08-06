import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  Globe,
  Settings,
  Key,
  Lock,
  Zap,
  Clock,
  Shield,
  Eye,
  Play,
  BarChart3,
  Sparkles,
  ArrowUpCircle,
  Code,
  Hash,
  CheckCircle,
  AlertCircle,
  Send,
  Square,
  Copy,
  ExternalLink,
  FileText,
  Download,
  Upload,
  Terminal,
  Activity,
} from "lucide-react";

interface HTTPClientConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
  isTesting?: boolean;
  testResponse?: any;
  testError?: string | null;
  testStats?: any;
  onSendTestRequest?: () => void;
  onCopyToClipboard?: (text: string, type: string) => void;
  generateCurlCommand?: () => string;
}

interface HTTPClientConfig {
  method: string;
  url: string;
  headers: string;
  url_params: string;
  body: string;
  content_type: string;
  auth_type: string;
  auth_token: string;
  auth_username: string;
  auth_password: string;
  api_key_header: string;
  api_key_value: string;
  timeout: number;
  max_retries: number;
  retry_delay: number;
  retry_exponential_backoff: boolean;
  retry_on_status_codes: string;
  circuit_breaker_enabled: boolean;
  follow_redirects: boolean;
  verify_ssl: boolean;
  enable_templating: boolean;
  // New fields from guide
  proxy_url: string;
  proxy_username: string;
  proxy_password: string;
  ssl_cert_path: string;
  ssl_key_path: string;
  ssl_ca_bundle: string;
  rate_limit_enabled: boolean;
  requests_per_second: number;
  burst_size: number;
  response_filter: string;
  extract_field: string;
  save_to_variable: string;
  test_mode: boolean;
  mock_response: string;
  debug_logging: boolean;
  save_request_response: boolean;
  connection_pooling: boolean;
  keep_alive: boolean;
  compression: string;
  timeout_optimization: boolean;
}

interface HttpResponse {
  status_code: number;
  content: any;
  headers: Record<string, string>;
  success: boolean;
  request_stats?: {
    duration_ms: number;
    size_bytes: number;
    timestamp: string;
  };
}

// HTTP Method Options with enhanced descriptions
const HTTP_METHODS = [
  {
    value: "GET",
    label: "GET ⭐",
    description:
      "Retrieve data from server • Safe, idempotent • Best for data fetching",
    icon: "📥",
    color: "from-blue-500 to-cyan-500",
  },
  {
    value: "POST",
    label: "POST",
    description:
      "Send data to server • Creates new resources • Best for form submissions",
    icon: "📤",
    color: "from-green-500 to-emerald-500",
  },
  {
    value: "PUT",
    label: "PUT",
    description: "Update entire resource • Idempotent • Replaces existing data",
    icon: "🔄",
    color: "from-orange-500 to-amber-500",
  },
  {
    value: "PATCH",
    label: "PATCH",
    description:
      "Partial resource update • Non-idempotent • Updates specific fields",
    icon: "🔧",
    color: "from-purple-500 to-pink-500",
  },
  {
    value: "DELETE",
    label: "DELETE",
    description: "Remove resource • Idempotent • Safe to retry",
    icon: "🗑️",
    color: "from-red-500 to-rose-500",
  },
  {
    value: "HEAD",
    label: "HEAD",
    description: "Get headers only • No response body • Metadata retrieval",
    icon: "📋",
    color: "from-gray-500 to-slate-500",
  },
  {
    value: "OPTIONS",
    label: "OPTIONS",
    description: "Get allowed methods • CORS preflight • API discovery",
    icon: "❓",
    color: "from-indigo-500 to-blue-500",
  },
];

// Content Type Options with enhanced descriptions
const CONTENT_TYPES = [
  {
    value: "application/json",
    label: "JSON ⭐",
    description: "application/json • Structured data • Most common for APIs",
    icon: "📊",
  },
  {
    value: "application/x-www-form-urlencoded",
    label: "Form Data",
    description:
      "application/x-www-form-urlencoded • Traditional forms • Legacy support",
    icon: "📝",
  },
  {
    value: "multipart/form-data",
    label: "Multipart Form",
    description: "multipart/form-data • File uploads • Binary data support",
    icon: "📎",
  },
  {
    value: "application/xml",
    label: "XML",
    description: "application/xml • Structured markup • Enterprise systems",
    icon: "📄",
  },
  {
    value: "text/plain",
    label: "Plain Text",
    description: "text/plain • Simple text • Minimal overhead",
    icon: "📝",
  },
  {
    value: "text/html",
    label: "HTML",
    description: "text/html • Web content • Browser rendering",
    icon: "🌐",
  },
  {
    value: "application/octet-stream",
    label: "Binary Data",
    description: "application/octet-stream • Raw binary • File downloads",
    icon: "💾",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Custom content type • Specify manually • Special cases",
    icon: "🔧",
  },
];

// Authentication Type Options with enhanced descriptions
const AUTH_TYPES = [
  {
    value: "none",
    label: "No Authentication",
    description: "Public endpoints • No credentials required • Open access",
    icon: "🔓",
  },
  {
    value: "bearer",
    label: "Bearer Token ⭐",
    description: "Authorization: Bearer <token> • JWT tokens • Modern APIs",
    icon: "🎫",
  },
  {
    value: "basic",
    label: "Basic Auth",
    description:
      "HTTP Basic Authentication • Username/password • Legacy systems",
    icon: "👤",
  },
  {
    value: "api_key",
    label: "API Key Header",
    description: "Custom API key header • Flexible placement • Custom auth",
    icon: "🔑",
  },
];

const HTTPClientConfigModal = forwardRef<
  HTMLDialogElement,
  HTTPClientConfigModalProps
>(
  (
    {
      nodeData,
      onSave,
      nodeId,
      isTesting = false,
      testResponse,
      testError,
      testStats,
      onSendTestRequest,
      onCopyToClipboard,
      generateCurlCommand,
    },
    ref
  ) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    useImperativeHandle(ref, () => dialogRef.current!);
    const [activeTab, setActiveTab] = useState("basic");
    const [curlImportText, setCurlImportText] = useState("");

    const initialValues: HTTPClientConfig = {
      method: nodeData?.method || "GET",
      url: nodeData?.url || "",
      headers: nodeData?.headers || "{}",
      url_params: nodeData?.url_params || "{}",
      body: nodeData?.body || "",
      content_type: nodeData?.content_type || "application/json",
      auth_type: nodeData?.auth_type || "none",
      auth_token: nodeData?.auth_token || "",
      auth_username: nodeData?.auth_username || "",
      auth_password: nodeData?.auth_password || "",
      api_key_header: nodeData?.api_key_header || "X-API-Key",
      api_key_value: nodeData?.api_key_value || "",
      timeout: nodeData?.timeout || 30,
      max_retries: nodeData?.max_retries || 3,
      retry_delay: nodeData?.retry_delay || 1.0,
      retry_exponential_backoff: nodeData?.retry_exponential_backoff || false,
      retry_on_status_codes:
        nodeData?.retry_on_status_codes || "[502, 503, 504]",
      circuit_breaker_enabled: nodeData?.circuit_breaker_enabled || false,
      follow_redirects: nodeData?.follow_redirects !== false,
      verify_ssl: nodeData?.verify_ssl !== false,
      enable_templating: nodeData?.enable_templating !== false,
      // New fields from guide
      proxy_url: nodeData?.proxy_url || "",
      proxy_username: nodeData?.proxy_username || "",
      proxy_password: nodeData?.proxy_password || "",
      ssl_cert_path: nodeData?.ssl_cert_path || "",
      ssl_key_path: nodeData?.ssl_key_path || "",
      ssl_ca_bundle: nodeData?.ssl_ca_bundle || "",
      rate_limit_enabled: nodeData?.rate_limit_enabled || false,
      requests_per_second: nodeData?.requests_per_second || 10,
      burst_size: nodeData?.burst_size || 50,
      response_filter: nodeData?.response_filter || "",
      extract_field: nodeData?.extract_field || "",
      save_to_variable: nodeData?.save_to_variable || "",
      test_mode: nodeData?.test_mode || false,
      mock_response: nodeData?.mock_response || "{}",
      debug_logging: nodeData?.debug_logging || false,
      save_request_response: nodeData?.save_request_response || false,
      connection_pooling: nodeData?.connection_pooling || false,
      keep_alive: nodeData?.keep_alive !== false,
      compression: nodeData?.compression || "none",
      timeout_optimization: nodeData?.timeout_optimization || false,
    };

    const parseCurlCommand = (curlText: string) => {
      try {
        // Basit cURL parsing logic
        const lines = curlText.split("\n");
        let method = "GET";
        let url = "";
        const headers: Record<string, string> = {};
        let body = "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith("curl")) {
            // Extract method and URL
            const methodMatch = trimmed.match(/-X\s+(\w+)/);
            if (methodMatch) method = methodMatch[1];

            const urlMatch = trimmed.match(/"([^"]+)"/);
            if (urlMatch) url = urlMatch[1];
          } else if (trimmed.startsWith("-H")) {
            // Extract headers
            const headerMatch = trimmed.match(/"([^:]+):\s*([^"]+)"/);
            if (headerMatch) {
              headers[headerMatch[1]] = headerMatch[2];
            }
          } else if (trimmed.startsWith("-d")) {
            // Extract body
            const bodyMatch = trimmed.match(/'([^']+)'/);
            if (bodyMatch) body = bodyMatch[1];
          }
        }

        return { method, url, headers, body };
      } catch (err) {
        console.error("Failed to parse cURL command:", err);
        return null;
      }
    };

    const handleCurlImport = () => {
      const parsed = parseCurlCommand(curlImportText);
      if (parsed) {
        // Update form values
        onSave({
          ...initialValues,
          method: parsed.method,
          url: parsed.url,
          headers: JSON.stringify(parsed.headers, null, 2),
          body: parsed.body,
        });
        setCurlImportText("");
      }
    };

    const formatDuration = (ms: number) => {
      if (ms < 1000) return `${ms}ms`;
      return `${(ms / 1000).toFixed(2)}s`;
    };

    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes}B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    };

    return (
      <dialog
        ref={dialogRef}
        className="modal modal-bottom sm:modal-middle backdrop-blur-sm"
      >
        <div
          className="modal-box max-w-6xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
        border border-slate-700/50 shadow-2xl shadow-purple-500/10 backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-700/50">
            <div
              className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl 
            flex items-center justify-center shadow-lg"
            >
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-white">
                HTTP Request Configuration
              </h3>
              <p className="text-slate-400 text-sm">
                Configure HTTP requests and test endpoints
              </p>
            </div>
          </div>

          <Formik
            initialValues={initialValues}
            enableReinitialize
            onSubmit={(values, { setSubmitting }) => {
              onSave(values);
              dialogRef.current?.close();
              setSubmitting(false);
            }}
          >
            {({ isSubmitting, values, setFieldValue }) => (
              <Form className="space-y-6">
                {/* Tab Navigation */}
                <div className="flex space-x-1 bg-slate-800/50 rounded-lg p-1">
                  {[
                    { id: "basic", label: "Basic", icon: Settings },
                    { id: "security", label: "Security", icon: Shield },
                    { id: "advanced", label: "Advanced", icon: Zap },
                    {
                      id: "performance",
                      label: "Performance",
                      icon: BarChart3,
                    },
                    { id: "test", label: "🎯 Test", icon: Send },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md 
                      transition-all duration-200 ${
                        activeTab === tab.id
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                          : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Basic Settings Tab */}
                {activeTab === "basic" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* HTTP Method */}
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-white">
                          HTTP Method
                        </label>
                        <Field
                          name="method"
                          as="select"
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                          text-white focus:outline-none focus:ring-2 focus:ring-blue-500 
                          focus:border-transparent"
                        >
                          {HTTP_METHODS.map((method) => (
                            <option key={method.value} value={method.value}>
                              {method.label}
                            </option>
                          ))}
                        </Field>
                      </div>

                      {/* URL */}
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-white">
                          URL
                        </label>
                        <Field
                          name="url"
                          type="text"
                          placeholder="https://api.example.com/endpoint"
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                          text-white placeholder-slate-400 focus:outline-none focus:ring-2 
                          focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Headers */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-white">
                        Headers (JSON)
                      </label>
                      <Field
                        name="headers"
                        as="textarea"
                        placeholder='{"Content-Type": "application/json", "Accept": "application/json"}'
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                        text-white placeholder-slate-400 focus:outline-none focus:ring-2 
                        focus:ring-blue-500 focus:border-transparent"
                        rows={4}
                      />
                    </div>

                    {/* Request Body */}
                    {values.method !== "GET" && (
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-white">
                          Request Body
                        </label>
                        <Field
                          name="body"
                          as="textarea"
                          placeholder='{"key": "value"}'
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                          text-white placeholder-slate-400 focus:outline-none focus:ring-2 
                          focus:ring-blue-500 focus:border-transparent"
                          rows={6}
                        />
                      </div>
                    )}

                    {/* Content Type */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-white">
                        Content Type
                      </label>
                      <Field
                        name="content_type"
                        as="select"
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                        text-white focus:outline-none focus:ring-2 focus:ring-blue-500 
                        focus:border-transparent"
                      >
                        {CONTENT_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </Field>
                      <p className="text-xs text-slate-400">
                        {
                          CONTENT_TYPES.find(
                            (t) => t.value === values.content_type
                          )?.description
                        }
                      </p>
                    </div>

                    {/* Authentication */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-white flex items-center space-x-2">
                        <Lock className="w-5 h-5" />
                        <span>🔐 Authentication</span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Auth Type */}
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-white">
                            Authentication Type
                          </label>
                          <Field
                            name="auth_type"
                            as="select"
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                            text-white focus:outline-none focus:ring-2 focus:ring-blue-500 
                            focus:border-transparent"
                          >
                            {AUTH_TYPES.map((auth) => (
                              <option key={auth.value} value={auth.value}>
                                {auth.label}
                              </option>
                            ))}
                          </Field>
                        </div>

                        {/* Auth Token */}
                        {values.auth_type === "bearer" && (
                          <div className="space-y-3">
                            <label className="block text-sm font-medium text-white">
                              Bearer Token
                            </label>
                            <Field
                              name="auth_token"
                              type="password"
                              placeholder="your-token-here"
                              className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                              text-white placeholder-slate-400 focus:outline-none focus:ring-2 
                              focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        )}

                        {/* Basic Auth */}
                        {values.auth_type === "basic" && (
                          <>
                            <div className="space-y-3">
                              <label className="block text-sm font-medium text-white">
                                Username
                              </label>
                              <Field
                                name="auth_username"
                                type="text"
                                placeholder="username"
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                                text-white placeholder-slate-400 focus:outline-none focus:ring-2 
                                focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div className="space-y-3">
                              <label className="block text-sm font-medium text-white">
                                Password
                              </label>
                              <Field
                                name="auth_password"
                                type="password"
                                placeholder="password"
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                                text-white placeholder-slate-400 focus:outline-none focus:ring-2 
                                focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </>
                        )}

                        {/* API Key */}
                        {values.auth_type === "api_key" && (
                          <>
                            <div className="space-y-3">
                              <label className="block text-sm font-medium text-white">
                                API Key Header
                              </label>
                              <Field
                                name="api_key_header"
                                type="text"
                                placeholder="X-API-Key"
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                                text-white placeholder-slate-400 focus:outline-none focus:ring-2 
                                focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div className="space-y-3">
                              <label className="block text-sm font-medium text-white">
                                API Key Value
                              </label>
                              <Field
                                name="auth_token"
                                type="password"
                                placeholder="your-api-key"
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                                text-white placeholder-slate-400 focus:outline-none focus:ring-2 
                                focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Advanced Settings Tab */}
                {activeTab === "advanced" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Timeout */}
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-white">
                          Timeout (seconds)
                        </label>
                        <Field
                          name="timeout"
                          type="number"
                          min="1"
                          max="300"
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                          text-white focus:outline-none focus:ring-2 focus:ring-blue-500 
                          focus:border-transparent"
                        />
                      </div>

                      {/* Max Retries */}
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-white">
                          Max Retries
                        </label>
                        <Field
                          name="max_retries"
                          type="number"
                          min="0"
                          max="10"
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                          text-white focus:outline-none focus:ring-2 focus:ring-blue-500 
                          focus:border-transparent"
                        />
                      </div>

                      {/* Retry Delay */}
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-white">
                          Retry Delay (seconds)
                        </label>
                        <Field
                          name="retry_delay"
                          type="number"
                          min="0.1"
                          max="10"
                          step="0.1"
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                          text-white focus:outline-none focus:ring-2 focus:ring-blue-500 
                          focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Follow Redirects */}
                      <div className="flex items-center space-x-3">
                        <Field
                          name="follow_redirects"
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded 
                          focus:ring-blue-500 focus:ring-2"
                        />
                        <label className="text-sm font-medium text-white">
                          Follow Redirects
                        </label>
                      </div>

                      {/* Verify SSL */}
                      <div className="flex items-center space-x-3">
                        <Field
                          name="verify_ssl"
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded 
                          focus:ring-blue-500 focus:ring-2"
                        />
                        <label className="text-sm font-medium text-white">
                          Verify SSL
                        </label>
                      </div>

                      {/* Enable Templating */}
                      <div className="flex items-center space-x-3">
                        <Field
                          name="enable_templating"
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded 
                          focus:ring-blue-500 focus:ring-2"
                        />
                        <label className="text-sm font-medium text-white">
                          Enable Templating
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Settings Tab */}
                {activeTab === "security" && (
                  <div className="space-y-6">
                    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                      <h4 className="text-lg font-semibold text-white flex items-center space-x-2 mb-4">
                        <Shield className="w-5 h-5" />
                        <span>🛡️ Security & SSL</span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* SSL Certificate Path */}
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-white">
                            SSL Certificate Path
                          </label>
                          <Field
                            name="ssl_cert_path"
                            type="text"
                            placeholder="/path/to/cert.pem"
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                            text-white placeholder-slate-400 focus:outline-none focus:ring-2 
                            focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* SSL Key Path */}
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-white">
                            SSL Key Path
                          </label>
                          <Field
                            name="ssl_key_path"
                            type="text"
                            placeholder="/path/to/key.pem"
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                            text-white placeholder-slate-400 focus:outline-none focus:ring-2 
                            focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* SSL CA Bundle */}
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-white">
                            SSL CA Bundle
                          </label>
                          <Field
                            name="ssl_ca_bundle"
                            type="text"
                            placeholder="/path/to/ca-bundle.crt"
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                            text-white placeholder-slate-400 focus:outline-none focus:ring-2 
                            focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Verify SSL */}
                        <div className="flex items-center space-x-3">
                          <Field
                            name="verify_ssl"
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded 
                            focus:ring-blue-500 focus:ring-2"
                          />
                          <label className="text-sm font-medium text-white">
                            Verify SSL Certificates
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Proxy Settings */}
                    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                      <h4 className="text-lg font-semibold text-white flex items-center space-x-2 mb-4">
                        <Globe className="w-5 h-5" />
                        <span>🌐 Proxy Configuration</span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Proxy URL */}
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-white">
                            Proxy URL
                          </label>
                          <Field
                            name="proxy_url"
                            type="text"
                            placeholder="http://proxy.company.com:8080"
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                            text-white placeholder-slate-400 focus:outline-none focus:ring-2 
                            focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Proxy Username */}
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-white">
                            Proxy Username
                          </label>
                          <Field
                            name="proxy_username"
                            type="text"
                            placeholder="proxy_user"
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                            text-white placeholder-slate-400 focus:outline-none focus:ring-2 
                            focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Proxy Password */}
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-white">
                            Proxy Password
                          </label>
                          <Field
                            name="proxy_password"
                            type="password"
                            placeholder="proxy_pass"
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                            text-white placeholder-slate-400 focus:outline-none focus:ring-2 
                            focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Performance Settings Tab */}
                {activeTab === "performance" && (
                  <div className="space-y-6">
                    {/* Rate Limiting */}
                    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                      <h4 className="text-lg font-semibold text-white flex items-center space-x-2 mb-4">
                        <BarChart3 className="w-5 h-5" />
                        <span>📊 Rate Limiting</span>
                      </h4>

                      <div className="flex items-center space-x-3 mb-4">
                        <Field
                          name="rate_limit_enabled"
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded 
                          focus:ring-blue-500 focus:ring-2"
                        />
                        <label className="text-sm font-medium text-white">
                          Enable Rate Limiting
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Requests Per Second */}
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-white">
                            Requests Per Second
                          </label>
                          <Field
                            name="requests_per_second"
                            type="number"
                            min="1"
                            max="1000"
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                            text-white focus:outline-none focus:ring-2 focus:ring-blue-500 
                            focus:border-transparent"
                          />
                        </div>

                        {/* Burst Size */}
                        <div className="space-y-3">
                          <label className="block text-sm font-medium text-white">
                            Burst Size
                          </label>
                          <Field
                            name="burst_size"
                            type="number"
                            min="1"
                            max="1000"
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                            text-white focus:outline-none focus:ring-2 focus:ring-blue-500 
                            focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Connection Settings */}
                    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                      <h4 className="text-lg font-semibold text-white flex items-center space-x-2 mb-4">
                        <Activity className="w-5 h-5" />
                        <span>🔗 Connection Settings</span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Connection Pooling */}
                        <div className="flex items-center space-x-3">
                          <Field
                            name="connection_pooling"
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded 
                            focus:ring-blue-500 focus:ring-2"
                          />
                          <label className="text-sm font-medium text-white">
                            Connection Pooling
                          </label>
                        </div>

                        {/* Keep Alive */}
                        <div className="flex items-center space-x-3">
                          <Field
                            name="keep_alive"
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded 
                            focus:ring-blue-500 focus:ring-2"
                          />
                          <label className="text-sm font-medium text-white">
                            Keep Alive
                          </label>
                        </div>

                        {/* Timeout Optimization */}
                        <div className="flex items-center space-x-3">
                          <Field
                            name="timeout_optimization"
                            type="checkbox"
                            className="w-4 h-4 text-blue-600 bg-slate-800 border-slate-600 rounded 
                            focus:ring-blue-500 focus:ring-2"
                          />
                          <label className="text-sm font-medium text-white">
                            Timeout Optimization
                          </label>
                        </div>
                      </div>

                      {/* Compression */}
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-white mb-2">
                          Compression
                        </label>
                        <Field
                          name="compression"
                          as="select"
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                          text-white focus:outline-none focus:ring-2 focus:ring-blue-500 
                          focus:border-transparent"
                        >
                          <option value="none">None</option>
                          <option value="gzip">Gzip</option>
                          <option value="deflate">Deflate</option>
                          <option value="br">Brotli</option>
                        </Field>
                      </div>
                    </div>

                    {/* Response Processing */}
                    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                      <h4 className="text-lg font-semibold text-white flex items-center space-x-2 mb-4">
                        <Code className="w-5 h-5" />
                        <span>🔧 Response Processing</span>
                      </h4>

                      <div className="space-y-4">
                        {/* Response Filter */}
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Response Filter (JSONPath)
                          </label>
                          <Field
                            name="response_filter"
                            type="text"
                            placeholder="$.data.users[*].{id: id, name: name}"
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                            text-white placeholder-slate-400 focus:outline-none focus:ring-2 
                            focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Extract Field */}
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Extract Field
                          </label>
                          <Field
                            name="extract_field"
                            type="text"
                            placeholder="data.access_token"
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                            text-white placeholder-slate-400 focus:outline-none focus:ring-2 
                            focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Save to Variable */}
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Save to Variable
                          </label>
                          <Field
                            name="save_to_variable"
                            type="text"
                            placeholder="user_token"
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                            text-white placeholder-slate-400 focus:outline-none focus:ring-2 
                            focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Test Panel Tab */}
                {activeTab === "test" && (
                  <div className="space-y-6">
                    {/* Test Control */}
                    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-white flex items-center space-x-2">
                          <Send className="w-5 h-5" />
                          <span>🎯 Test Request</span>
                        </h4>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={onSendTestRequest}
                            disabled={isTesting || !values.url}
                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 
                            text-white rounded-lg flex items-center space-x-2 hover:from-green-400 
                            hover:to-green-500 transition-all duration-200 disabled:opacity-50 
                            disabled:cursor-not-allowed"
                          >
                            <Send className="w-4 h-4" />
                            <span>
                              {isTesting ? "TESTING..." : "SEND REQUEST"}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              isTesting
                                ? "bg-yellow-400 animate-pulse"
                                : testResponse
                                ? "bg-green-400"
                                : "bg-gray-400"
                            }`}
                          ></div>
                          <span className="text-slate-300">
                            {isTesting
                              ? "🟡 Testing request..."
                              : testResponse
                              ? "🟢 Ready to send"
                              : "⚪ Ready to test"}
                          </span>
                        </div>

                        {values.url && (
                          <div className="text-slate-400 text-sm">
                            Status: {values.method} {values.url}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* cURL Import */}
                    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                        <Terminal className="w-5 h-5" />
                        <span>📋 Import cURL Command</span>
                      </h4>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Paste your cURL command below:
                          </label>
                          <textarea
                            value={curlImportText}
                            onChange={(e) => setCurlImportText(e.target.value)}
                            placeholder={
                              'curl -X POST "https://api.example.com/users" -H "Content-Type: application/json" -d \'{"name": "John"}\''
                            }
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg 
                            text-white placeholder-slate-400 focus:outline-none focus:ring-2 
                            focus:ring-blue-500 focus:border-transparent"
                            rows={4}
                          />
                        </div>

                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={handleCurlImport}
                            disabled={!curlImportText.trim()}
                            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 
                            text-white rounded-lg hover:from-blue-400 hover:to-blue-500 
                            transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            🔄 Parse & Import
                          </button>
                          <button
                            type="button"
                            onClick={() => setCurlImportText("")}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                          >
                            ❌ Clear
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Generated cURL */}
                    {generateCurlCommand && (
                      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                          <Terminal className="w-5 h-5" />
                          <span>📋 Generated cURL Command</span>
                        </h4>

                        <div className="space-y-4">
                          <div className="bg-slate-900 p-3 rounded">
                            <pre className="text-xs text-slate-300 overflow-x-auto">
                              {generateCurlCommand()}
                            </pre>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              onCopyToClipboard?.(generateCurlCommand(), "cURL")
                            }
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg 
                            flex items-center space-x-2 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                            <span>Copy cURL</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Test Results */}
                    {testResponse && (
                      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                          <BarChart3 className="w-5 h-5" />
                          <span>📊 Response Analysis</span>
                        </h4>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300">Status:</span>
                            <span
                              className={`font-semibold ${
                                testResponse.success
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              {testResponse.status_code}{" "}
                              {testResponse.success ? "✅ Success" : "❌ Error"}
                            </span>
                          </div>

                          {testStats && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-300">Duration:</span>
                              <span className="text-white font-semibold">
                                {formatDuration(testStats.duration_ms)}
                              </span>
                            </div>
                          )}

                          {testStats && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-300">Size:</span>
                              <span className="text-white font-semibold">
                                {formatSize(testStats.size_bytes)}
                              </span>
                            </div>
                          )}

                          {/* Response Headers */}
                          {testResponse.headers &&
                            Object.keys(testResponse.headers).length > 0 && (
                              <div className="space-y-2">
                                <h5 className="text-sm font-medium text-slate-300">
                                  Headers:
                                </h5>
                                <div className="bg-slate-900 p-3 rounded max-h-32 overflow-y-auto">
                                  {Object.entries(testResponse.headers).map(
                                    ([key, value]) => (
                                      <div
                                        key={key}
                                        className="text-xs text-slate-300"
                                      >
                                        <span className="text-blue-400">
                                          {key}:
                                        </span>{" "}
                                        {value as any}
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}

                          {/* Response Body */}
                          {testResponse.content && (
                            <div className="space-y-2">
                              <h5 className="text-sm font-medium text-slate-300">
                                Body:
                              </h5>
                              <div className="bg-slate-900 p-3 rounded max-h-64 overflow-y-auto">
                                <pre className="text-xs text-slate-300">
                                  {typeof testResponse.content === "string"
                                    ? testResponse.content
                                    : JSON.stringify(
                                        testResponse.content,
                                        null,
                                        2
                                      )}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Error Display */}
                    {testError && (
                      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertCircle className="w-5 h-5 text-red-400" />
                          <span className="text-red-400 font-semibold">
                            Error
                          </span>
                        </div>
                        <p className="text-red-300 text-sm">{testError}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-slate-700/50">
                  <button
                    type="button"
                    onClick={() => dialogRef.current?.close()}
                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg 
                    transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 
                    hover:from-blue-400 hover:to-purple-500 text-white rounded-lg 
                    transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Saving..." : "Save Configuration"}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </dialog>
    );
  }
);

// Toggle Field Component
const ToggleField = ({
  name,
  icon,
  label,
  description,
}: {
  name: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
}) => (
  <Field name={name}>
    {({ field }: any) => (
      <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-600/20">
        <div className="flex items-center space-x-3">
          <div className="text-slate-400">{icon}</div>
          <div>
            <div className="text-white text-sm font-medium">{label}</div>
            {description && (
              <div className="text-slate-400 text-xs">{description}</div>
            )}
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            {...field}
            type="checkbox"
            checked={field.value}
            className="sr-only peer"
          />
          <div
            className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer 
            peer-checked:after:translate-x-full peer-checked:after:border-white 
            after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
            after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all 
            peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-purple-600"
          ></div>
        </label>
      </div>
    )}
  </Field>
);

export default HTTPClientConfigModal;
