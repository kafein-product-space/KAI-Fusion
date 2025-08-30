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
  Radio,
  ExternalLink,
  FileText,
} from "lucide-react";
import TabNavigation from "~/components/common/TabNavigation";

// Standard props interface matching other config forms
interface WebhookTriggerConfigFormProps {
  configData?: any;
  onSave?: (values: any) => void;
  onCancel: () => void;
  initialValues?: any;
  validate?: (values: any) => any;
  onSubmit?: (values: any) => void;
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
  configData,
  onSave,
  onCancel,
  initialValues: propInitialValues,
  validate: propValidate,
  onSubmit: propOnSubmit,
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
  
  // Default values for missing fields
  const initialValues = propInitialValues || {
    http_method: configData?.http_method || "POST",
    authentication_required: configData?.authentication_required ?? false,
    webhook_token: configData?.webhook_token || "",
    allowed_event_types: configData?.allowed_event_types || "",
    max_payload_size: configData?.max_payload_size || 1024,
    rate_limit_per_minute: configData?.rate_limit_per_minute || 60,
    enable_cors: configData?.enable_cors ?? true,
    webhook_timeout: configData?.webhook_timeout || 30,
    allowed_ips: configData?.allowed_ips || "",
    max_concurrent_connections: configData?.max_concurrent_connections || 100,
    connection_timeout: configData?.connection_timeout || 30,
    enable_response_cache: configData?.enable_response_cache ?? false,
    cache_duration: configData?.cache_duration || 300,
    enable_websocket_broadcast: configData?.enable_websocket_broadcast ?? false,
    realtime_channels: configData?.realtime_channels || "",
    tenant_isolation: configData?.tenant_isolation ?? false,
    tenant_header: configData?.tenant_header || "X-Tenant-ID",
    circuit_breaker: configData?.circuit_breaker ?? false,
  };

  const [currentValues, setCurrentValues] = useState(initialValues);
  
  // Validation function
  const validate = propValidate || ((values: any) => {
    const errors: any = {};
    if (!values.max_payload_size || values.max_payload_size < 1) {
      errors.max_payload_size = "Max payload size must be at least 1 KB";
    }
    if (!values.rate_limit_per_minute || values.rate_limit_per_minute < 0) {
      errors.rate_limit_per_minute = "Rate limit must be at least 0";
    }
    if (!values.webhook_timeout || values.webhook_timeout < 5 || values.webhook_timeout > 300) {
      errors.webhook_timeout = "Webhook timeout must be between 5 and 300 seconds";
    }
    return errors;
  });

  // Use the provided onSubmit or fallback to onSave
  const handleSubmit = propOnSubmit || onSave;
  
  // Use passed props or fallback to mock data for testing features
  const finalWebhookEndpoint = webhookEndpoint || "http://localhost:8000/api/webhooks/trigger/123";
  const finalEvents = events || [];
  const finalStats = stats || { total_events: 0 };
  const finalIsListening = isListening || false;
  
  // Mock functions for testing features if not provided
  const finalOnTestEvent = onTestEvent || (() => {});
  const finalOnStopListening = onStopListening || (() => {});
  const finalOnCopyToClipboard = onCopyToClipboard || ((text: string, type: string) => {
    navigator.clipboard.writeText(text);
  });

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
    {
      id: "testing",
      label: "🎯 Testing & Events",
      icon: TestTube,
      description: "Test webhook and view events",
    },
  ];

  const generateCurlCommand = () => {
    if (!finalWebhookEndpoint) return "";

    const method = currentValues.http_method || "POST";
    const timestamp = new Date().toISOString();
    const authHeader =
      currentValues.authentication_required && currentValues.webhook_token
        ? `-H "Authorization: Bearer ${currentValues.webhook_token}" \\\n  `
        : "";

    switch (method) {
      case "GET":
        return `curl -X GET "${finalWebhookEndpoint}?event_type=test.event&data=test&timestamp=${timestamp}" \\
  ${authHeader}`;

      case "POST":
        return `curl -X POST "${finalWebhookEndpoint}" \\
  -H "Content-Type: application/json" \\
  ${authHeader}-d '{"event_type": "test.event", "data": {"message": "Hello World"}, "timestamp": "${timestamp}"}'`;

      case "PUT":
        return `curl -X PUT "${finalWebhookEndpoint}" \\
  -H "Content-Type: application/json" \\
  ${authHeader}-d '{"event_type": "test.update", "data": {"id": 123, "status": "updated"}, "timestamp": "${timestamp}"}'`;

      case "PATCH":
        return `curl -X PATCH "${finalWebhookEndpoint}" \\
  -H "Content-Type: application/json" \\
  ${authHeader}-d '{"event_type": "test.partial_update", "data": {"status": "active"}, "timestamp": "${timestamp}"}'`;

      case "DELETE":
        return `curl -X DELETE "${finalWebhookEndpoint}?event_type=test.delete&id=123&timestamp=${timestamp}" \\
  ${authHeader}`;

      case "HEAD":
        return `curl -X HEAD "${finalWebhookEndpoint}" \\
  ${authHeader}`;

      default:
        return `curl -X POST "${finalWebhookEndpoint}" \\
  -H "Content-Type: application/json" \\
  ${authHeader}-d '{"event_type": "test.event", "data": {"message": "Hello World"}, "timestamp": "${timestamp}"}'`;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="w-full h-full">
      <Formik
        initialValues={initialValues}
        validate={(values) => {
          setCurrentValues(values);
          return validate(values);
        }}
        onSubmit={(values, { setSubmitting }) => {
          console.log("Form submitted with values:", values);
          if (handleSubmit) {
            handleSubmit(values);
          }
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
            <Form className="space-y-8 w-full p-6" onSubmit={handleSubmit}>
              {/* Tab Navigation */}
              <TabNavigation
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                className="mb-4"
              />

              {/* Tab Content */}
              <div className="space-y-6">
                {/* Basic Configuration Tab */}
                {activeTab === "basic" && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-400 uppercase tracking-wider">
                      <Settings className="w-3 h-3" />
                      <span>Basic Settings</span>
                    </div>

                    {/* HTTP Method */}
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        HTTP Method
                      </label>
                      <Field
                        as="select"
                        name="http_method"
                        className="select select-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
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
                      <p className="text-sm text-slate-400 mt-1">
                        Choose the HTTP method for webhook requests
                      </p>
                      <ErrorMessage
                        name="http_method"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Authentication Required
                      </label>
                      <Field
                        as="select"
                        name="authentication_required"
                        className="select select-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
                      >
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </Field>
                      <ErrorMessage
                        name="authentication_required"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                    </div>

                    {/* Authentication Token - Only show if authentication is required */}
                    {currentValues.authentication_required && (
                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">
                          Authentication Token
                        </label>
                        <Field
                          type="text"
                          name="webhook_token"
                          placeholder="Enter Bearer token for authentication"
                          className="input input-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
                        />
                        <p className="text-sm text-slate-400 mt-1">
                          This token will be used as Bearer token in
                          Authorization header
                        </p>
                        <ErrorMessage
                          name="webhook_token"
                          component="div"
                          className="text-red-400 text-sm mt-1"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Allowed Event Types
                      </label>
                      <Field
                        as="textarea"
                        name="allowed_event_types"
                        placeholder="user.created, order.completed, data.updated (comma-separated, empty = all)"
                        className="textarea textarea-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
                        rows={2}
                      />
                    </div>
                  </div>
                )}

                {/* Security Configuration Tab */}
                {activeTab === "security" && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-sm font-semibold text-green-400 uppercase tracking-wider">
                      <Shield className="w-3 h-3" />
                      <span>Security Settings</span>
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Max Payload Size (KB)
                      </label>
                      <Field
                        type="number"
                        name="max_payload_size"
                        className="input input-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
                        min="1"
                        max="10240"
                      />
                      <ErrorMessage
                        name="max_payload_size"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Rate Limit (per minute)
                      </label>
                      <Field
                        type="number"
                        name="rate_limit_per_minute"
                        className="input input-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
                        min="0"
                        max="1000"
                      />
                      <ErrorMessage
                        name="rate_limit_per_minute"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Enable CORS
                      </label>
                      <Field
                        as="select"
                        name="enable_cors"
                        className="select select-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
                      >
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </Field>
                      <ErrorMessage
                        name="enable_cors"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Webhook Timeout (seconds)
                      </label>
                      <Field
                        type="number"
                        name="webhook_timeout"
                        className="input input-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
                        min="5"
                        max="300"
                      />
                      <ErrorMessage
                        name="webhook_timeout"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Secret Token
                      </label>
                      <Field
                        type="password"
                        name="webhook_token"
                        className="input input-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
                        placeholder="Enter secret token"
                      />
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Allowed IPs (Optional)
                      </label>
                      <Field
                        as="textarea"
                        name="allowed_ips"
                        className="textarea textarea-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
                        placeholder="192.168.1.1, 10.0.0.0/8"
                        rows={2}
                      />
                    </div>
                  </div>
                )}

                {/* Advanced Configuration Tab */}
                {activeTab === "advanced" && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-sm font-semibold text-purple-400 uppercase tracking-wider">
                      <Zap className="w-3 h-3" />
                      <span>Advanced Features</span>
                    </div>

                    {/* Performance Settings */}
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Max Concurrent Connections
                      </label>
                      <Field
                        type="number"
                        name="max_concurrent_connections"
                        className="input input-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
                        min="1"
                        max="1000"
                        placeholder="100"
                      />
                      <p className="text-sm text-slate-400 mt-1">
                        Maximum number of concurrent webhook connections
                      </p>
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Connection Timeout (seconds)
                      </label>
                      <Field
                        type="number"
                        name="connection_timeout"
                        className="input input-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
                        min="5"
                        max="300"
                        placeholder="30"
                      />
                    </div>

                    {/* Caching Settings */}
                    <div>
                      <label className="flex items-center gap-2 text-white text-sm font-medium mb-1">
                        <Field
                          name="enable_response_cache"
                          type="checkbox"
                          className="w-3 h-3 text-blue-600 bg-slate-900/80 border rounded"
                        />
                        Enable Response Caching
                      </label>
                      <p className="text-sm text-slate-400 ml-5">
                        Cache webhook responses for better performance
                      </p>
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Cache Duration (seconds)
                      </label>
                      <Field
                        type="number"
                        name="cache_duration"
                        className="input input-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
                        min="60"
                        max="3600"
                        placeholder="300"
                      />
                    </div>

                    {/* WebSocket Broadcasting */}
                    <div>
                      <label className="flex items-center gap-2 text-white text-sm font-medium mb-1">
                        <Field
                          name="enable_websocket_broadcast"
                          type="checkbox"
                          className="w-3 h-3 text-blue-600 bg-slate-900/80 border rounded"
                        />
                        Enable WebSocket Broadcasting
                      </label>
                      <p className="text-sm text-slate-400 ml-5">
                        Broadcast webhook events via WebSocket
                      </p>
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Realtime Channels
                      </label>
                      <Field
                        as="textarea"
                        name="realtime_channels"
                        className="textarea textarea-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
                        placeholder="admin, analytics, monitoring"
                        rows={2}
                      />
                      <p className="text-sm text-slate-400 mt-1">
                        Comma-separated list of WebSocket channels
                      </p>
                    </div>

                    {/* Tenant Isolation */}
                    <div>
                      <label className="flex items-center gap-2 text-white text-sm font-medium mb-1">
                        <Field
                          name="tenant_isolation"
                          type="checkbox"
                          className="w-3 h-3 text-blue-600 bg-slate-900/80 border rounded"
                        />
                        Enable Tenant Isolation
                      </label>
                      <p className="text-sm text-slate-400 ml-5">
                        Separate webhook processing per tenant
                      </p>
                    </div>

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Tenant Header
                      </label>
                      <Field
                        type="text"
                        name="tenant_header"
                        className="input input-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 focus:ring-1 focus:ring-blue-500/20"
                        placeholder="X-Tenant-ID"
                      />
                    </div>

                    {/* Circuit Breaker */}
                    <div>
                      <label className="flex items-center gap-2 text-white text-sm font-medium mb-1">
                        <Field
                          name="circuit_breaker"
                          type="checkbox"
                          className="w-3 h-3 text-blue-600 bg-slate-900/80 border rounded"
                        />
                        Enable Circuit Breaker
                      </label>
                      <p className="text-sm text-slate-400 ml-5">
                        Automatically handle failures and timeouts
                      </p>
                    </div>
                  </div>
                )}

                {/* Testing & Events Tab */}
                {activeTab === "testing" && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-sm font-semibold text-yellow-400 uppercase tracking-wider">
                      <TestTube className="w-3 h-3" />
                      <span>Testing & Events</span>
                    </div>

                    {/* Webhook Endpoint Display */}
                    <div className="mb-3">
                      <label className="text-white text-sm font-medium mb-2 block">
                        Webhook Endpoint
                      </label>
                      <div className="bg-slate-800/50 p-3 rounded border border-gray-600">
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="w-3 h-3 text-blue-400" />
                          <span className="text-blue-400 text-sm font-semibold">
                            Listening URL:
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={finalWebhookEndpoint || "Loading..."}
                            readOnly
                            className="input input-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              finalOnCopyToClipboard?.(
                                finalWebhookEndpoint || "",
                                "endpoint"
                              )
                            }
                            className="btn btn-sm btn-ghost text-white"
                            title="Copy URL"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-slate-400 text-sm mt-2">
                          Send {initialValues.http_method || "POST"} requests to
                          this URL to trigger the webhook
                        </div>
                      </div>
                    </div>

                    {/* Test Event Buttons */}
                    <div className="flex gap-2 mb-3">
                      <button
                        type="button"
                        onClick={finalOnTestEvent}
                        disabled={finalIsListening}
                        className="btn btn-sm flex-1 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white border-0"
                      >
                        <Radio className="w-3 h-3 mr-1" />
                        {finalIsListening ? "Listening..." : "Start Listening"}
                      </button>
                      {finalIsListening && (
                        <button
                          type="button"
                          onClick={finalOnStopListening}
                          className="btn btn-sm bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white border-0"
                        >
                          <Activity className="w-3 h-3 mr-1" />
                          Stop
                        </button>
                      )}
                    </div>

                    {/* Stream Status */}
                    <div className="bg-slate-800/50 p-2 rounded text-sm text-white mb-3">
                      <div className="flex items-center gap-1 mb-1">
                        <Activity className="w-2 h-2 text-blue-400" />
                        <span>
                          Stream Status: {finalIsListening ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {finalIsListening && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-green-400">
                            Listening for events...
                          </span>
                        </div>
                      )}
                      {!finalIsListening && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                          <span className="text-red-400">Not listening</span>
                        </div>
                      )}
                    </div>

                    {/* cURL Command */}
                    {finalWebhookEndpoint && (
                      <div className="mb-3">
                        <label className="text-white text-sm font-medium mb-2 block">
                          cURL Command
                        </label>
                        <div className="flex gap-2">
                          <textarea
                            value={generateCurlCommand()}
                            readOnly
                            className="textarea textarea-bordered w-full bg-slate-900/80 text-white text-sm rounded px-4 py-3 border border-gray-600"
                            rows={4}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              finalOnCopyToClipboard?.(generateCurlCommand(), "curl")
                            }
                            className="btn btn-sm btn-ghost text-white"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Recent Events */}
                    {finalEvents && finalEvents.length > 0 && (
                      <div>
                        <label className="text-white text-sm font-medium mb-2 block flex items-center gap-2">
                          <FileText className="w-3 h-3" />
                          Recent Events ({finalEvents.length})
                        </label>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {finalEvents.slice(0, 3).map((event, index) => (
                            <div
                              key={index}
                              className="bg-slate-800/50 p-2 rounded text-sm text-white"
                            >
                              <div className="flex items-center gap-1">
                                <Clock className="w-2 h-2 text-blue-400" />
                                <span className="text-blue-400">
                                  {event.timestamp
                                    ? new Date(
                                        event.timestamp
                                      ).toLocaleTimeString()
                                    : "No timestamp"}
                                </span>
                              </div>
                              <div className="text-slate-300 truncate">
                                {event.data
                                  ? JSON.stringify(event.data).substring(0, 50)
                                  : "No data"}
                                {event.data ? "..." : ""}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Statistics */}
                    {finalStats && (
                      <div>
                        <label className="text-white text-sm font-medium mb-2 block flex items-center gap-2">
                          <BarChart3 className="w-3 h-3" />
                          Statistics
                        </label>
                        <div className="bg-slate-800/50 p-2 rounded text-sm text-white space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-400">
                              Total Events:
                            </span>
                            <span className="text-white font-semibold">
                              {finalStats.total_events || 0}
                            </span>
                          </div>
                          {finalStats.last_event_at && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">
                                Last Event:
                              </span>
                              <span className="text-white">
                                {formatTime(finalStats.last_event_at)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </Form>
          );
        }}
      </Formik>
    </div>
  );
}
