import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  Webhook,
  Settings,
  Shield,
  Zap,
  Clock,
  Globe,
  Eye,
  Play,
  BarChart3,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Key,
  Lock,
  Hash,
  Code,
  Server,
  Activity,
  Radio,
  Square,
  Copy,
  Ear,
  ExternalLink,
  FileText,
  Users,
  Calendar,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import {
  type WebhookTriggerConfig,
  type WebhookEvent,
  type WebhookStats,
} from "../../../nodes/triggers/WebhookTrigger/types";

interface WebhookTriggerConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
  isListening?: boolean;
  events?: any[];
  stats?: any;
  webhookEndpoint?: string;
  webhookToken?: string;
  onStartListening?: () => void;
  onStopListening?: () => void;
  onCopyToClipboard?: (text: string, type: string) => void;
  generateCurlCommand?: () => string;
}

// Event Type Options with enhanced descriptions
const EVENT_TYPES = [
  {
    value: "webhook.received",
    label: "Webhook Received ⭐",
    description: "Standard webhook event • Triggers on any incoming webhook",
    icon: "📥",
  },
  {
    value: "user.created",
    label: "User Created",
    description: "User registration events • Account creation triggers",
    icon: "👤",
  },
  {
    value: "order.completed",
    label: "Order Completed",
    description: "E-commerce events • Payment processing triggers",
    icon: "🛒",
  },
  {
    value: "data.updated",
    label: "Data Updated",
    description: "Data modification events • CRUD operation triggers",
    icon: "📊",
  },
  {
    value: "system.alert",
    label: "System Alert",
    description: "System monitoring events • Error and warning triggers",
    icon: "⚠️",
  },
];

const WebhookTriggerConfigModal = forwardRef<
  HTMLDialogElement,
  WebhookTriggerConfigModalProps
>(
  (
    {
      nodeData,
      onSave,
      nodeId,
      isListening = false,
      events = [],
      stats,
      webhookEndpoint = "",
      webhookToken = "",
      onStartListening,
      onStopListening,
      onCopyToClipboard,
      generateCurlCommand,
    },
    ref
  ) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    useImperativeHandle(ref, () => dialogRef.current!);
    const [activeTab, setActiveTab] = useState("basic");

    const initialValues: WebhookTriggerConfig = {
      http_method: nodeData?.http_method || "POST",
      authentication_required: nodeData?.authentication_required !== false,
      allowed_event_types: nodeData?.allowed_event_types || "",
      max_payload_size: nodeData?.max_payload_size || 1024,
      rate_limit_per_minute: nodeData?.rate_limit_per_minute || 60,
      enable_cors: nodeData?.enable_cors !== false,
      webhook_timeout: nodeData?.webhook_timeout || 30,
    };

    const formatTime = (timestamp: string) => {
      return new Date(timestamp).toLocaleTimeString();
    };

    const formatDate = (timestamp: string) => {
      return new Date(timestamp).toLocaleDateString();
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
              className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl 
            flex items-center justify-center shadow-lg"
            >
              <Webhook className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-white">
                Webhook Trigger Configuration
              </h3>
              <p className="text-slate-400 text-sm">
                Configure webhook endpoint settings and test real-time events
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
                    { id: "test", label: "🎯 Test", icon: Radio },
                    {
                      id: "endpoint",
                      label: "🔗 Endpoint",
                      icon: ExternalLink,
                    },
                    { id: "stats", label: "📊 Stats", icon: BarChart3 },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md 
                      transition-all duration-200 ${
                        activeTab === tab.id
                          ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg"
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
                    {/* HTTP Method Selection */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-white flex items-center space-x-2">
                        <Server className="w-4 h-4" />
                        <span>HTTP Method</span>
                      </label>
                      <Field
                        name="http_method"
                        as="select"
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                        text-white focus:outline-none focus:ring-2 focus:ring-purple-500 
                        focus:border-transparent"
                      >
                        <option value="GET">GET - Retrieve data (query parameters)</option>
                        <option value="POST">POST - Create/send data (JSON body)</option>
                        <option value="PUT">PUT - Update/replace data (JSON body)</option>
                        <option value="PATCH">PATCH - Partial update (JSON body)</option>
                        <option value="DELETE">DELETE - Remove data (query parameters)</option>
                        <option value="HEAD">HEAD - Headers only (no body)</option>
                      </Field>
                      <p className="text-slate-400 text-sm">
                        Choose the HTTP method your webhook endpoint should accept
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Authentication Required */}
                      <ToggleField
                        name="authentication_required"
                        icon={<Lock className="w-4 h-4" />}
                        label="Authentication Required"
                        description="Require Bearer token for webhook access"
                      />

                      {/* Enable CORS */}
                      <ToggleField
                        name="enable_cors"
                        icon={<Globe className="w-4 h-4" />}
                        label="Enable CORS"
                        description="Allow cross-origin requests"
                      />
                    </div>

                    {/* Allowed Event Types */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-white">
                        Allowed Event Types
                      </label>
                      <Field
                        name="allowed_event_types"
                        as="textarea"
                        placeholder="user.created, order.completed, data.updated (comma-separated, empty = all)"
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                        text-white placeholder-slate-400 focus:outline-none focus:ring-2 
                        focus:ring-purple-500 focus:border-transparent"
                        rows={3}
                      />
                      <p className="text-slate-400 text-sm">
                        Leave empty to accept all event types
                      </p>
                    </div>
                  </div>
                )}

                {/* Security Settings Tab */}
                {activeTab === "security" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Max Payload Size */}
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-white">
                          Max Payload Size (KB)
                        </label>
                        <Field
                          name="max_payload_size"
                          type="number"
                          min="1"
                          max="10240"
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                          text-white focus:outline-none focus:ring-2 focus:ring-purple-500 
                          focus:border-transparent"
                        />
                        <p className="text-slate-400 text-sm">
                          Maximum allowed payload size in kilobytes
                        </p>
                      </div>

                      {/* Rate Limit */}
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-white">
                          Rate Limit (per minute)
                        </label>
                        <Field
                          name="rate_limit_per_minute"
                          type="number"
                          min="0"
                          max="1000"
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                          text-white focus:outline-none focus:ring-2 focus:ring-purple-500 
                          focus:border-transparent"
                        />
                        <p className="text-slate-400 text-sm">
                          Maximum requests per minute (0 = unlimited)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Advanced Settings Tab */}
                {activeTab === "advanced" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Webhook Timeout */}
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-white">
                          Webhook Timeout (seconds)
                        </label>
                        <Field
                          name="webhook_timeout"
                          type="number"
                          min="5"
                          max="300"
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg 
                          text-white focus:outline-none focus:ring-2 focus:ring-purple-500 
                          focus:border-transparent"
                        />
                        <p className="text-slate-400 text-sm">
                          Request timeout in seconds
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Test Panel Tab */}
                {activeTab === "test" && (
                  <div className="space-y-6">
                    {/* Listen Control */}
                    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-white flex items-center space-x-2">
                          <Radio className="w-5 h-5" />
                          <span>🎯 Test Webhook</span>
                        </h4>
                        <div className="flex space-x-2">
                          {!isListening ? (
                            <button
                              type="button"
                              onClick={onStartListening}
                              className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 
                              text-white rounded-lg flex items-center space-x-2 hover:from-green-400 
                              hover:to-green-500 transition-all duration-200"
                            >
                              <Radio className="w-4 h-4" />
                              <span>LISTEN FOR TEST EVENT</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={onStopListening}
                              className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 
                              text-white rounded-lg flex items-center space-x-2 hover:from-red-400 
                              hover:to-red-500 transition-all duration-200"
                            >
                              <Square className="w-4 h-4" />
                              <span>STOP LISTENING</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              isListening
                                ? "bg-green-400 animate-pulse"
                                : "bg-gray-400"
                            }`}
                          ></div>
                          <span className="text-slate-300">
                            {isListening
                              ? "🟢 Listening for test event..."
                              : "⚪ Ready to listen"}
                          </span>
                        </div>

                        {webhookEndpoint && (
                          <div className="text-slate-400 text-sm">
                            Waiting for webhook call to:
                            <br />
                            <code className="bg-slate-900 px-2 py-1 rounded text-green-400">
                              {values.http_method || "POST"} {webhookEndpoint}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recent Events */}
                    {events.length > 0 && (
                      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                        <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                          <FileText className="w-5 h-5" />
                          <span>📨 Recent Events (Live)</span>
                        </h4>

                        <div className="space-y-3 max-h-64 overflow-y-auto">
                          {events.map((event, index) => (
                            <div
                              key={index}
                              className="bg-slate-900/50 rounded-lg p-4 border border-slate-600/50"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <CheckCircle className="w-4 h-4 text-green-400" />
                                  <span className="text-white font-medium">
                                    {event.event_type}
                                  </span>
                                  <span className="text-slate-400">|</span>
                                  <span className="text-slate-400">
                                    {formatTime(event.received_at)}
                                  </span>
                                  <span className="text-slate-400">|</span>
                                  <span className="text-slate-400">
                                    {event.client_ip}
                                  </span>
                                </div>
                              </div>
                              <pre className="text-slate-300 text-sm bg-slate-800 p-2 rounded overflow-x-auto">
                                {JSON.stringify(event.data, null, 2)}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Endpoint Display Tab */}
                {activeTab === "endpoint" && webhookEndpoint && (
                  <div className="space-y-6">
                    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                        <ExternalLink className="w-5 h-5" />
                        <span>🔗 Webhook Endpoint</span>
                      </h4>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            URL:
                          </label>
                          <div className="flex items-center space-x-2">
                            <code className="flex-1 bg-slate-900 px-3 py-2 rounded text-green-400 text-sm">
                              {webhookEndpoint}
                            </code>
                            <button
                              type="button"
                              onClick={() =>
                                onCopyToClipboard?.(webhookEndpoint, "URL")
                              }
                              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white transition-colors"
                              title="Copy URL"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Method:
                          </label>
                          <code className="bg-slate-900 px-3 py-2 rounded text-blue-400 text-sm">
                            {values.http_method || "POST"}
                          </code>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Auth:
                          </label>
                          <div className="flex items-center space-x-2">
                            <code className="flex-1 bg-slate-900 px-3 py-2 rounded text-purple-400 text-sm">
                              Bearer {webhookToken}
                            </code>
                            <button
                              type="button"
                              onClick={() =>
                                onCopyToClipboard?.(webhookToken, "Token")
                              }
                              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white transition-colors"
                              title="Copy Token"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            cURL Command:
                          </label>
                          <div className="flex items-center space-x-2">
                            <pre className="flex-1 bg-slate-900 px-3 py-2 rounded text-slate-300 text-sm overflow-x-auto">
                              {generateCurlCommand?.() ||
                                "curl command not available"}
                            </pre>
                            <button
                              type="button"
                              onClick={() =>
                                onCopyToClipboard?.(
                                  generateCurlCommand?.() || "",
                                  "cURL"
                                )
                              }
                              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white transition-colors"
                              title="Copy cURL"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Statistics Tab */}
                {activeTab === "stats" && stats && (
                  <div className="space-y-6">
                    <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                        <BarChart3 className="w-5 h-5" />
                        <span>📊 Webhook Statistics</span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300">
                              Total Events:
                            </span>
                            <span className="text-white font-semibold">
                              {stats.total_events}
                            </span>
                          </div>

                          {stats.last_event_at && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-300">
                                Last Event:
                              </span>
                              <span className="text-white font-semibold">
                                {formatDate(stats.last_event_at)}{" "}
                                {formatTime(stats.last_event_at)}
                              </span>
                            </div>
                          )}
                        </div>

                        {stats.event_types &&
                          Object.keys(stats.event_types).length > 0 && (
                            <div className="space-y-3">
                              <h5 className="text-sm font-medium text-slate-300">
                                Event Types:
                              </h5>
                              <div className="space-y-2">
                                {Object.entries(stats.event_types).map(
                                  ([type, count]) => (
                                    <div
                                      key={type}
                                      className="flex items-center justify-between"
                                    >
                                      <span className="text-slate-400 text-sm">
                                        • {type}
                                      </span>
                                      <span className="text-white text-sm">
                                        ({count as any})
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        {stats.sources &&
                          Object.keys(stats.sources).length > 0 && (
                            <div className="space-y-3">
                              <h5 className="text-sm font-medium text-slate-300">
                                Sources:
                              </h5>
                              <div className="space-y-2">
                                {Object.entries(stats.sources).map(
                                  ([source, count]) => (
                                    <div
                                      key={source}
                                      className="flex items-center justify-between"
                                    >
                                      <span className="text-slate-400 text-sm">
                                        • {source}
                                      </span>
                                      <span className="text-white text-sm">
                                        ({count as any})
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
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
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-600 
                    hover:from-purple-400 hover:to-pink-500 text-white rounded-lg 
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
            peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-pink-600"
          ></div>
        </label>
      </div>
    )}
  </Field>
);

export default WebhookTriggerConfigModal;
