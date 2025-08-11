import React, { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  Globe,
  Settings,
  Shield,
  Activity,
  Copy,
  TestTube,
  BarChart3,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Key,
  Lock,
  Send,
  Download,
  Upload,
  Cpu,
  Wifi,
  FileText,
  Database,
  Trash,
} from "lucide-react";
import type { HTTPClientConfig } from "./types";
import TabNavigation from "~/components/common/TabNavigation";

interface HTTPClientConfigFormProps {
  configData: HTTPClientConfig;
  onSave: (values: Partial<HTTPClientConfig>) => void;
  onCancel: () => void;
  isTesting?: boolean;
  testResponse?: any;
  testError?: string | null;
  testStats?: any;
  onSendTestRequest?: () => void;
  onCopyToClipboard?: (text: string, type: string) => void;
  generateCurlCommand?: () => string;
}

export default function HTTPClientConfigForm({
  configData,
  onSave,
  onCancel,
  isTesting = false,
  testResponse,
  testError,
  testStats,
  onSendTestRequest,
  onCopyToClipboard,
  generateCurlCommand,
}: HTTPClientConfigFormProps) {
  const [activeTab, setActiveTab] = useState("basic");

  const tabs = [
    {
      id: "basic",
      label: "Basic",
      icon: Settings,
      description: "Basic HTTP configuration",
    },
    {
      id: "security",
      label: "Security",
      icon: Shield,
      description: "Security and authentication settings",
    },
    {
      id: "performance",
      label: "Performance",
      icon: Zap,
      description: "Performance and optimization settings",
    },
    {
      id: "test",
      label: "Test",
      icon: TestTube,
      description: "Test and debug settings",
    },
  ];

  const HTTP_METHODS = [
    {
      value: "GET",
      label: "GET",
      description: "Retrieve data",
      icon: Download,
    },
    {
      value: "POST",
      label: "POST",
      description: "Create new resource",
      icon: Upload,
    },
    {
      value: "PUT",
      label: "PUT",
      description: "Update entire resource",
      icon: Database,
    },
    {
      value: "PATCH",
      label: "PATCH",
      description: "Partial update",
      icon: FileText,
    },
    {
      value: "DELETE",
      label: "DELETE",
      description: "Remove resource",
      icon: Trash,
    },
    {
      value: "HEAD",
      label: "HEAD",
      description: "Get headers only",
      icon: FileText,
    },
    {
      value: "OPTIONS",
      label: "OPTIONS",
      description: "Get allowed methods",
      icon: Settings,
    },
  ];

  const CONTENT_TYPES = [
    { value: "application/json", label: "JSON" },
    { value: "application/xml", label: "XML" },
    { value: "text/plain", label: "Plain Text" },
    { value: "application/x-www-form-urlencoded", label: "Form Data" },
    { value: "multipart/form-data", label: "Multipart" },
  ];

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
    <div className="relative w-96 h-auto min-h-96 rounded-2xl flex flex-col bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl border border-white/20 backdrop-blur-sm z-50">
      {/* Header */}
      <div className="flex items-center justify-between w-full px-4 py-3 border-b border-white/20">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-white" />
          <span className="text-white text-sm font-medium">HTTP Client</span>
        </div>
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        className="px-4 py-2"
      />

      <Formik
        initialValues={configData}
        enableReinitialize
        validateOnMount={false}
        validateOnChange={false}
        validateOnBlur={true}
        validate={(values) => {
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
          return errors;
        }}
        onSubmit={(values) => onSave(values)}
      >
        {({ values, errors, touched, isSubmitting, setFieldValue }) => (
          <Form className="flex-1 flex flex-col">
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {/* Basic Tab */}
              {activeTab === "basic" && (
                <div className="space-y-4">
                  {/* URL */}
                  <div>
                    <label className="text-white text-xs font-medium mb-2 block">
                      URL
                    </label>
                    <Field
                      name="url"
                      placeholder="https://api.example.com/endpoint"
                      className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none"
                    />
                    <ErrorMessage
                      name="url"
                      component="div"
                      className="text-red-400 text-xs mt-1"
                    />
                  </div>

                  {/* HTTP Method */}
                  <div>
                    <label className="text-white text-xs font-medium mb-2 block">
                      HTTP Method
                    </label>
                    <Field
                      as="select"
                      name="method"
                      className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none"
                    >
                      {HTTP_METHODS.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label} - {method.description}
                        </option>
                      ))}
                    </Field>
                  </div>

                  {/* Content Type */}
                  <div>
                    <label className="text-white text-xs font-medium mb-2 block">
                      Content Type
                    </label>
                    <Field
                      as="select"
                      name="content_type"
                      className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none"
                    >
                      {CONTENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </Field>
                  </div>

                  {/* Request Body */}
                  {["POST", "PUT", "PATCH"].includes(values.method) && (
                    <div>
                      <label className="text-white text-xs font-medium mb-2 block">
                        Request Body
                      </label>
                      <Field
                        as="textarea"
                        name="body"
                        placeholder='{"key": "value"}'
                        rows={4}
                        className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none font-mono"
                      />
                    </div>
                  )}

                  {/* Timeout */}
                  <div>
                    <label className="text-white text-xs font-medium mb-2 block">
                      Timeout (seconds)
                    </label>
                    <Field
                      type="number"
                      name="timeout"
                      min="1"
                      max="300"
                      className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none"
                    />
                    <ErrorMessage
                      name="timeout"
                      component="div"
                      className="text-red-400 text-xs mt-1"
                    />
                  </div>

                  {/* Retry Settings */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-white text-xs font-medium mb-2 block">
                        Retry Count
                      </label>
                      <Field
                        type="number"
                        name="retry_count"
                        min="0"
                        max="10"
                        className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-white text-xs font-medium mb-2 block">
                        Retry Delay (ms)
                      </label>
                      <Field
                        type="number"
                        name="retry_delay"
                        min="100"
                        max="10000"
                        className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Testing Section */}
                  <div className="pt-4 border-t border-white/20">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white text-sm font-medium">
                        Testing
                      </h3>
                      <div className="flex gap-2">
                        {onSendTestRequest && (
                          <button
                            type="button"
                            onClick={onSendTestRequest}
                            disabled={isTesting || !values.url}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-xs rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            {isTesting ? "Testing..." : "Test"}
                          </button>
                        )}
                        {generateCurlCommand && onCopyToClipboard && (
                          <button
                            type="button"
                            onClick={() =>
                              onCopyToClipboard(generateCurlCommand(), "cURL")
                            }
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg flex items-center gap-1 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                            cURL
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Test Results */}
                    {testResponse && (
                      <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 text-xs font-medium">
                            Success - {testResponse.status_code}
                          </span>
                        </div>
                        {testStats && (
                          <div className="text-green-300 text-xs">
                            Duration: {formatDuration(testStats.duration_ms)} |
                            Size: {formatSize(testStats.response_size)}
                          </div>
                        )}
                      </div>
                    )}

                    {testError && (
                      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <span className="text-red-400 text-xs font-medium">
                            Error
                          </span>
                        </div>
                        <div className="text-red-300 text-xs">{testError}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-4">
                  {/* Authentication */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Authentication
                    </h3>

                    {/* API Key */}
                    <div className="mb-3">
                      <label className="text-white text-xs font-medium mb-2 block">
                        API Key Header
                      </label>
                      <Field
                        name="api_key_header"
                        placeholder="Authorization"
                        className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-white text-xs font-medium mb-2 block">
                        API Key Value
                      </label>
                      <Field
                        name="api_key_value"
                        type="password"
                        placeholder="Bearer token or API key"
                        className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Basic Auth */}
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="text-white text-xs font-medium mb-2 block">
                          Username
                        </label>
                        <Field
                          name="auth_username"
                          className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-white text-xs font-medium mb-2 block">
                          Password
                        </label>
                        <Field
                          name="auth_password"
                          type="password"
                          className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SSL Settings */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      SSL Settings
                    </h3>

                    <div className="flex items-center gap-2 mb-3">
                      <Field
                        type="checkbox"
                        name="verify_ssl"
                        className="w-4 h-4 text-blue-600 bg-slate-900 border-white/20 rounded focus:ring-blue-500"
                      />
                      <label className="text-white text-xs">
                        Verify SSL Certificate
                      </label>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="text-white text-xs font-medium mb-2 block">
                          SSL Certificate Path
                        </label>
                        <Field
                          name="ssl_cert_path"
                          className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-white text-xs font-medium mb-2 block">
                          SSL Key Path
                        </label>
                        <Field
                          name="ssl_key_path"
                          className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Custom Headers */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Custom Headers
                    </h3>
                    <Field
                      as="textarea"
                      name="custom_headers"
                      placeholder='{"X-Custom-Header": "value"}'
                      rows={3}
                      className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Performance Tab */}
              {activeTab === "performance" && (
                <div className="space-y-4">
                  {/* Rate Limiting */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Rate Limiting
                    </h3>

                    <div className="flex items-center gap-2 mb-3">
                      <Field
                        type="checkbox"
                        name="rate_limit_enabled"
                        className="w-4 h-4 text-blue-600 bg-slate-900 border-white/20 rounded focus:ring-blue-500"
                      />
                      <label className="text-white text-xs">
                        Enable Rate Limiting
                      </label>
                    </div>

                    {values.rate_limit_enabled && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-white text-xs font-medium mb-2 block">
                            Requests per Window
                          </label>
                          <Field
                            type="number"
                            name="rate_limit_requests"
                            min="1"
                            className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-white text-xs font-medium mb-2 block">
                            Window (seconds)
                          </label>
                          <Field
                            type="number"
                            name="rate_limit_window"
                            min="1"
                            className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Connection Settings */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Connection Settings
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-white text-xs font-medium mb-2 block">
                          Connection Timeout (s)
                        </label>
                        <Field
                          type="number"
                          name="connection_timeout"
                          min="1"
                          className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-white text-xs font-medium mb-2 block">
                          Read Timeout (s)
                        </label>
                        <Field
                          type="number"
                          name="read_timeout"
                          min="1"
                          className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <Field
                        type="checkbox"
                        name="keep_alive"
                        className="w-4 h-4 text-blue-600 bg-slate-900 border-white/20 rounded focus:ring-blue-500"
                      />
                      <label className="text-white text-xs">
                        Keep-Alive Connection
                      </label>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <Field
                        type="checkbox"
                        name="connection_pooling"
                        className="w-4 h-4 text-blue-600 bg-slate-900 border-white/20 rounded focus:ring-blue-500"
                      />
                      <label className="text-white text-xs">
                        Connection Pooling
                      </label>
                    </div>
                  </div>

                  {/* Circuit Breaker */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Circuit Breaker
                    </h3>

                    <div className="flex items-center gap-2 mb-3">
                      <Field
                        type="checkbox"
                        name="circuit_breaker_enabled"
                        className="w-4 h-4 text-blue-600 bg-slate-900 border-white/20 rounded focus:ring-blue-500"
                      />
                      <label className="text-white text-xs">
                        Enable Circuit Breaker
                      </label>
                    </div>

                    {values.circuit_breaker_enabled && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-white text-xs font-medium mb-2 block">
                            Failure Threshold
                          </label>
                          <Field
                            type="number"
                            name="circuit_breaker_threshold"
                            min="1"
                            className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-white text-xs font-medium mb-2 block">
                            Timeout (s)
                          </label>
                          <Field
                            type="number"
                            name="circuit_breaker_timeout"
                            min="1"
                            className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Test Tab */}
              {activeTab === "test" && (
                <div className="space-y-4">
                  {/* Test Configuration */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Test Configuration
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-white text-xs font-medium mb-2 block">
                          Success Status Codes
                        </label>
                        <Field
                          name="success_status_codes"
                          placeholder="200,201,202"
                          className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-white text-xs font-medium mb-2 block">
                          Retry Status Codes
                        </label>
                        <Field
                          name="retry_on_status_codes"
                          placeholder="500,502,503,504"
                          className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <Field
                        type="checkbox"
                        name="retry_exponential_backoff"
                        className="w-4 h-4 text-blue-600 bg-slate-900 border-white/20 rounded focus:ring-blue-500"
                      />
                      <label className="text-white text-xs">
                        Exponential Backoff
                      </label>
                    </div>
                  </div>

                  {/* Debug Settings */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Debug Settings
                    </h3>

                    <div className="flex items-center gap-2 mb-3">
                      <Field
                        type="checkbox"
                        name="logging_enabled"
                        className="w-4 h-4 text-blue-600 bg-slate-900 border-white/20 rounded focus:ring-blue-500"
                      />
                      <label className="text-white text-xs">
                        Enable Logging
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <Field
                        type="checkbox"
                        name="debug_mode"
                        className="w-4 h-4 text-blue-600 bg-slate-900 border-white/20 rounded focus:ring-blue-500"
                      />
                      <label className="text-white text-xs">Debug Mode</label>
                    </div>
                  </div>

                  {/* Response Validation */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Response Validation
                    </h3>
                    <Field
                      as="textarea"
                      name="response_validation"
                      placeholder="JSON schema or validation rules"
                      rows={3}
                      className="text-xs text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-white/20 focus:border-blue-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-white/20">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs rounded-lg transition-colors"
              >
                {isSubmitting ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
