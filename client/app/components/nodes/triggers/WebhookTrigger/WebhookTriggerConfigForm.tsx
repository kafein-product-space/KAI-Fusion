import React, { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  Settings,
  Webhook,
  Shield,
  Activity,
  Copy,
  TestTube,
  BarChart3,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Globe,
  Key,
  Lock,
} from "lucide-react";
import type { WebhookTriggerConfig } from "./types";
import TabNavigation from "~/components/common/TabNavigation";

interface WebhookTriggerConfigFormProps {
  initialValues: WebhookTriggerConfig;
  validate: (values: WebhookTriggerConfig) => any;
  onSubmit: (values: WebhookTriggerConfig) => void;
  onCancel: () => void;
  webhookEndpoint?: string;
  webhookToken?: string;
  events?: any[];
  stats?: any;
  isListening?: boolean;
  onTestEvent?: () => void;
  onStopListening?: () => void;
  onCopyToClipboard?: (text: string, type: string) => void;
}

export default function WebhookTriggerConfigForm({
  initialValues,
  validate,
  onSubmit,
  onCancel,
  webhookEndpoint,
  webhookToken,
  events,
  stats,
  isListening,
  onTestEvent,
  onStopListening,
  onCopyToClipboard,
}: WebhookTriggerConfigFormProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [currentValues, setCurrentValues] = useState(initialValues);

  const tabs = [
    {
      id: "basic",
      label: "Basic",
      icon: Settings,
      description: "Basic webhook configuration",
    },
    {
      id: "security",
      label: "Security",
      icon: Shield,
      description: "Security and authentication settings",
    },
    {
      id: "advanced",
      label: "Advanced",
      icon: Zap,
      description: "Advanced features and performance",
    },
  ];

  const generateCurlCommand = () => {
    if (!webhookEndpoint) return "";

    const method = currentValues.http_method || "POST";
    const timestamp = new Date().toISOString();
    const authHeader =
      currentValues.authentication_required && currentValues.webhook_token
        ? `-H "Authorization: Bearer ${currentValues.webhook_token}" \\\n  `
        : "";

    switch (method) {
      case "GET":
        return `curl -X GET "${webhookEndpoint}?event_type=test.event&data=test&timestamp=${timestamp}" \\
  ${authHeader}`;

      case "POST":
        return `curl -X POST "${webhookEndpoint}" \\
  -H "Content-Type: application/json" \\
  ${authHeader}-d '{"event_type": "test.event", "data": {"message": "Hello World"}, "timestamp": "${timestamp}"}'`;

      case "PUT":
        return `curl -X PUT "${webhookEndpoint}" \\
  -H "Content-Type: application/json" \\
  ${authHeader}-d '{"event_type": "test.update", "data": {"id": 123, "status": "updated"}, "timestamp": "${timestamp}"}'`;

      case "PATCH":
        return `curl -X PATCH "${webhookEndpoint}" \\
  -H "Content-Type: application/json" \\
  ${authHeader}-d '{"event_type": "test.partial_update", "data": {"status": "active"}, "timestamp": "${timestamp}"}'`;

      case "DELETE":
        return `curl -X DELETE "${webhookEndpoint}?event_type=test.delete&id=123&timestamp=${timestamp}" \\
  ${authHeader}`;

      case "HEAD":
        return `curl -X HEAD "${webhookEndpoint}" \\
  ${authHeader}`;

      default:
        return `curl -X POST "${webhookEndpoint}" \\
  -H "Content-Type: application/json" \\
  ${authHeader}-d '{"event_type": "test.event", "data": {"message": "Hello World"}, "timestamp": "${timestamp}"}'`;
    }
  };

  return (
    <div className="relative p-2 w-80 h-auto min-h-32 rounded-2xl flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl border border-white/20 backdrop-blur-sm">
      <div className="flex items-center justify-between w-full px-3 py-2 border-b border-white/20">
        <div className="flex items-center gap-2">
          <Webhook className="w-4 h-4 text-white" />
          <span className="text-white text-xs font-medium">
            Webhook Trigger
          </span>
        </div>
        <Settings className="w-4 h-4 text-white" />
      </div>

      <Formik
        initialValues={initialValues}
        validate={(values) => {
          setCurrentValues(values);
          const errors: any = {};

          if (!values.max_payload_size || values.max_payload_size < 1) {
            errors.max_payload_size = "Max payload size must be at least 1 KB";
          }

          if (
            !values.rate_limit_per_minute ||
            values.rate_limit_per_minute < 0
          ) {
            errors.rate_limit_per_minute = "Rate limit must be at least 0";
          }

          if (
            !values.webhook_timeout ||
            values.webhook_timeout < 5 ||
            values.webhook_timeout > 300
          ) {
            errors.webhook_timeout =
              "Webhook timeout must be between 5 and 300 seconds";
          }

          return errors;
        }}
        onSubmit={(values, { setSubmitting }) => {
          console.log("Form submitted with values:", values);
          onSubmit(values);
          setSubmitting(false);
        }}
        enableReinitialize
      >
        {({
          values,
          errors,
          touched,
          isSubmitting,
          isValid,
          handleSubmit,
          setFieldValue,
          setFieldTouched,
        }) => {
          const handleTabChange = (tabId: string) => {
            setActiveTab(tabId);
          };

          return (
            <Form className="space-y-3 w-full p-3" onSubmit={handleSubmit}>
              {/* Tab Navigation */}
              <TabNavigation
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                className="mb-4"
              />

              {/* Tab Content */}
              <div className="space-y-3">
                {/* Basic Configuration Tab */}
                {activeTab === "basic" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
                      <Settings className="w-3 h-3" />
                      <span>Basic Settings</span>
                    </div>

                    {/* HTTP Method */}
                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        HTTP Method
                      </label>
                      <Field
                        as="select"
                        name="http_method"
                        className="select select-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                      >
                        <option value="POST">POST - JSON Body (Default)</option>
                        <option value="GET">GET - Query Parameters</option>
                        <option value="PUT">PUT - Full Resource Update</option>
                        <option value="PATCH">PATCH - Partial Update</option>
                        <option value="DELETE">
                          DELETE - Query Parameters
                        </option>
                        <option value="HEAD">HEAD - Headers Only</option>
                      </Field>
                      <p className="text-xs text-slate-400 mt-1">
                        Choose the HTTP method for webhook requests
                      </p>
                      <ErrorMessage
                        name="http_method"
                        component="div"
                        className="text-red-400 text-xs mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Authentication Required
                      </label>
                      <Field
                        as="select"
                        name="authentication_required"
                        className="select select-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                      >
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </Field>
                      <ErrorMessage
                        name="authentication_required"
                        component="div"
                        className="text-red-400 text-xs mt-1"
                      />
                    </div>

                    {/* Authentication Token - Only show if authentication is required */}
                    {currentValues.authentication_required && (
                      <div>
                        <label className="text-white text-xs font-medium mb-1 block">
                          Authentication Token
                        </label>
                        <Field
                          type="text"
                          name="webhook_token"
                          placeholder="Enter Bearer token for authentication"
                          className="input input-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                          This token will be used as Bearer token in
                          Authorization header
                        </p>
                        <ErrorMessage
                          name="webhook_token"
                          component="div"
                          className="text-red-400 text-xs mt-1"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Allowed Event Types
                      </label>
                      <Field
                        as="textarea"
                        name="allowed_event_types"
                        placeholder="user.created, order.completed, data.updated (comma-separated, empty = all)"
                        className="textarea textarea-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                        rows={2}
                      />
                    </div>

                    {/* Testing Section */}
                    <div className="pt-4 border-t border-white/20">
                      <div className="flex items-center gap-2 text-xs font-semibold text-yellow-400 uppercase tracking-wider mb-3">
                        <TestTube className="w-3 h-3" />
                        <span>Testing & Events</span>
                      </div>

                      {/* Webhook Endpoint Display */}
                      <div className="mb-3">
                        <label className="text-white text-xs font-medium mb-1 block">
                          Webhook Endpoint
                        </label>
                        <div className="bg-slate-800/50 p-3 rounded border border-slate-600/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Globe className="w-3 h-3 text-blue-400" />
                            <span className="text-blue-400 text-xs font-semibold">
                              Listening URL:
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={webhookEndpoint || "Loading..."}
                              readOnly
                              className="input input-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                onCopyToClipboard?.(
                                  webhookEndpoint || "",
                                  "endpoint"
                                )
                              }
                              className="btn btn-sm btn-ghost text-white"
                              title="Copy URL"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="text-slate-400 text-xs mt-2">
                            Send {initialValues.http_method || "POST"} requests
                            to this URL to trigger the webhook
                          </div>
                        </div>
                      </div>

                      {/* Test Event Buttons */}
                      <div className="flex gap-2 mb-3">
                        <button
                          type="button"
                          onClick={onTestEvent}
                          disabled={isListening}
                          className="btn btn-sm flex-1 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white border-0"
                        >
                          <TestTube className="w-3 h-3 mr-1" />
                          {isListening ? "Listening..." : "Start Listening"}
                        </button>
                        {isListening && (
                          <button
                            type="button"
                            onClick={onStopListening}
                            className="btn btn-sm bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white border-0"
                          >
                            <Activity className="w-3 h-3 mr-1" />
                            Stop
                          </button>
                        )}
                      </div>

                      {/* Stream Status */}
                      <div className="bg-slate-800/50 p-2 rounded text-xs text-white mb-3">
                        <div className="flex items-center gap-1 mb-1">
                          <Activity className="w-2 h-2 text-blue-400" />
                          <span>
                            Stream Status: {isListening ? "Active" : "Inactive"}
                          </span>
                        </div>
                        {isListening && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <span className="text-green-400">
                              Listening for events...
                            </span>
                          </div>
                        )}
                        {!isListening && (
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                            <span className="text-red-400">Not listening</span>
                          </div>
                        )}
                      </div>

                      {/* cURL Command */}
                      {webhookEndpoint && (
                        <div className="mb-3">
                          <label className="text-white text-xs font-medium mb-1 block">
                            cURL Command
                          </label>
                          <div className="flex gap-2">
                            <textarea
                              value={generateCurlCommand()}
                              readOnly
                              className="textarea textarea-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50"
                              rows={4}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                onCopyToClipboard?.(
                                  generateCurlCommand(),
                                  "curl"
                                )
                              }
                              className="btn btn-sm btn-ghost text-white"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Recent Events */}
                      {events && events.length > 0 && (
                        <div>
                          <label className="text-white text-xs font-medium mb-1 block">
                            Recent Events ({events.length})
                          </label>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {events.slice(0, 3).map((event, index) => (
                              <div
                                key={index}
                                className="bg-slate-800/50 p-2 rounded text-xs text-white"
                              >
                                <div className="flex items-center gap-1">
                                  <Clock className="w-2 h-2 text-blue-400" />
                                  <span className="text-blue-400">
                                    {event.timestamp 
                                      ? new Date(event.timestamp).toLocaleTimeString()
                                      : 'No timestamp'
                                    }
                                  </span>
                                </div>
                                <div className="text-slate-300 truncate">
                                  {event.data ? JSON.stringify(event.data).substring(0, 50) : 'No data'}
                                  {event.data ? '...' : ''}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Security Configuration Tab */}
                {activeTab === "security" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-green-400 uppercase tracking-wider">
                      <Shield className="w-3 h-3" />
                      <span>Security Settings</span>
                    </div>

                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Max Payload Size (KB)
                      </label>
                      <Field
                        type="number"
                        name="max_payload_size"
                        className="input input-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                        min="1"
                        max="10240"
                      />
                      <ErrorMessage
                        name="max_payload_size"
                        component="div"
                        className="text-red-400 text-xs mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Rate Limit (per minute)
                      </label>
                      <Field
                        type="number"
                        name="rate_limit_per_minute"
                        className="input input-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                        min="0"
                        max="1000"
                      />
                      <ErrorMessage
                        name="rate_limit_per_minute"
                        component="div"
                        className="text-red-400 text-xs mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Enable CORS
                      </label>
                      <Field
                        as="select"
                        name="enable_cors"
                        className="select select-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                      >
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </Field>
                      <ErrorMessage
                        name="enable_cors"
                        component="div"
                        className="text-red-400 text-xs mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Webhook Timeout (seconds)
                      </label>
                      <Field
                        type="number"
                        name="webhook_timeout"
                        className="input input-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                        min="5"
                        max="300"
                      />
                      <ErrorMessage
                        name="webhook_timeout"
                        component="div"
                        className="text-red-400 text-xs mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Secret Token
                      </label>
                      <Field
                        type="password"
                        name="webhook_token"
                        className="input input-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                        placeholder="Enter secret token"
                      />
                    </div>

                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Allowed IPs (Optional)
                      </label>
                      <Field
                        as="textarea"
                        name="allowed_ips"
                        className="textarea textarea-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                        placeholder="192.168.1.1, 10.0.0.0/8"
                        rows={2}
                      />
                    </div>
                  </div>
                )}

                {/* Advanced Configuration Tab */}
                {activeTab === "advanced" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                      <Zap className="w-3 h-3" />
                      <span>Advanced Features</span>
                    </div>

                    {/* Performance Settings */}
                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Max Concurrent Connections
                      </label>
                      <Field
                        type="number"
                        name="max_concurrent_connections"
                        className="input input-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                        min="1"
                        max="1000"
                        placeholder="100"
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Maximum number of concurrent webhook connections
                      </p>
                    </div>

                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Connection Timeout (seconds)
                      </label>
                      <Field
                        type="number"
                        name="connection_timeout"
                        className="input input-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                        min="5"
                        max="300"
                        placeholder="30"
                      />
                    </div>

                    {/* Caching Settings */}
                    <div>
                      <label className="flex items-center gap-2 text-white text-xs font-medium mb-1">
                        <Field
                          name="enable_response_cache"
                          type="checkbox"
                          className="w-3 h-3 text-blue-600 bg-slate-900/80 border rounded"
                        />
                        Enable Response Caching
                      </label>
                      <p className="text-xs text-slate-400 ml-5">
                        Cache webhook responses for better performance
                      </p>
                    </div>

                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Cache Duration (seconds)
                      </label>
                      <Field
                        type="number"
                        name="cache_duration"
                        className="input input-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                        min="60"
                        max="3600"
                        placeholder="300"
                      />
                    </div>

                    {/* WebSocket Broadcasting */}
                    <div>
                      <label className="flex items-center gap-2 text-white text-xs font-medium mb-1">
                        <Field
                          name="enable_websocket_broadcast"
                          type="checkbox"
                          className="w-3 h-3 text-blue-600 bg-slate-900/80 border rounded"
                        />
                        Enable WebSocket Broadcasting
                      </label>
                      <p className="text-xs text-slate-400 ml-5">
                        Broadcast webhook events via WebSocket
                      </p>
                    </div>

                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Realtime Channels
                      </label>
                      <Field
                        as="textarea"
                        name="realtime_channels"
                        className="textarea textarea-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                        placeholder="admin, analytics, monitoring"
                        rows={2}
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Comma-separated list of WebSocket channels
                      </p>
                    </div>

                    {/* Tenant Isolation */}
                    <div>
                      <label className="flex items-center gap-2 text-white text-xs font-medium mb-1">
                        <Field
                          name="tenant_isolation"
                          type="checkbox"
                          className="w-3 h-3 text-blue-600 bg-slate-900/80 border rounded"
                        />
                        Enable Tenant Isolation
                      </label>
                      <p className="text-xs text-slate-400 ml-5">
                        Separate webhook processing per tenant
                      </p>
                    </div>

                    <div>
                      <label className="text-white text-xs font-medium mb-1 block">
                        Tenant Header
                      </label>
                      <Field
                        type="text"
                        name="tenant_header"
                        className="input input-bordered w-full bg-slate-900/80 text-white text-xs rounded px-3 py-2 border border-slate-600/50 focus:ring-1 focus:ring-blue-500/20"
                        placeholder="X-Tenant-ID"
                      />
                    </div>

                    {/* Circuit Breaker */}
                    <div>
                      <label className="flex items-center gap-2 text-white text-xs font-medium mb-1">
                        <Field
                          name="circuit_breaker"
                          type="checkbox"
                          className="w-3 h-3 text-blue-600 bg-slate-900/80 border rounded"
                        />
                        Enable Circuit Breaker
                      </label>
                      <p className="text-xs text-slate-400 ml-5">
                        Automatically handle failures and timeouts
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-white/20">
                <button
                  type="button"
                  onClick={onCancel}
                  className="btn btn-sm btn-ghost text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-sm bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white border-0"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </Form>
          );
        }}
      </Formik>
    </div>
  );
}
