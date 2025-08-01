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
} from "lucide-react";

interface WebhookTriggerConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
}

interface WebhookTriggerConfig {
  authentication_required: boolean;
  allowed_event_types: string;
  max_payload_size: number;
  rate_limit_per_minute: number;
  enable_cors: boolean;
  webhook_timeout: number;
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
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);
  const [activeTab, setActiveTab] = useState("basic");

  const initialValues: WebhookTriggerConfig = {
    authentication_required: nodeData?.authentication_required !== false,
    allowed_event_types: nodeData?.allowed_event_types || "",
    max_payload_size: nodeData?.max_payload_size || 1024,
    rate_limit_per_minute: nodeData?.rate_limit_per_minute || 60,
    enable_cors: nodeData?.enable_cors !== false,
    webhook_timeout: nodeData?.webhook_timeout || 30,
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-bottom sm:modal-middle backdrop-blur-sm"
    >
      <div
        className="modal-box max-w-4xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
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
              Configure webhook endpoint settings and security
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

              {/* Basic Configuration Tab */}
              {activeTab === "basic" && (
                <div className="space-y-6">
                  {/* Webhook Information */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Server className="w-5 h-5 text-purple-400" />
                      <label className="text-white font-semibold">
                        Webhook Information
                      </label>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          Endpoint URL
                        </label>
                        <div className="bg-slate-900/80 border border-slate-600/50 rounded-lg px-4 py-3">
                          <code className="text-green-400 font-mono text-sm">
                            POST /api/webhooks/
                            {nodeData?.webhook_id || "webhook_id"}
                          </code>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Your webhook endpoint URL
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          Authentication
                        </label>
                        <div className="bg-slate-900/80 border border-slate-600/50 rounded-lg px-4 py-3">
                          <code className="text-blue-400 font-mono text-sm">
                            Authorization: Bearer &lt;token&gt;
                          </code>
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          Required for secure webhook calls
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Event Types Configuration */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Activity className="w-5 h-5 text-green-400" />
                      <label className="text-white font-semibold">
                        Event Types
                      </label>
                    </div>

                    <div>
                      <label className="text-slate-300 text-sm mb-2 block">
                        Allowed Event Types
                      </label>
                      <Field
                        className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                          text-white placeholder-slate-400 px-4 py-3 focus:border-green-500 focus:ring-2 
                          focus:ring-green-500/20 transition-all"
                        name="allowed_event_types"
                        placeholder="webhook.received,user.created,order.completed"
                      />
                      <div className="text-xs text-slate-400 mt-1">
                        Comma-separated list of allowed event types (empty = all
                        allowed)
                      </div>
                    </div>

                    {/* Event Type Examples */}
                    <div className="mt-4 p-3 bg-slate-900/30 rounded-lg border border-slate-600/30">
                      <div className="text-xs text-slate-300 mb-2">
                        Common Event Types:
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {EVENT_TYPES.map((event) => (
                          <div
                            key={event.value}
                            className="flex items-center space-x-2 text-xs"
                          >
                            <span className="text-slate-400">{event.icon}</span>
                            <span className="text-slate-300">
                              {event.label}
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400">
                              {event.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Example Payload */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Code className="w-5 h-5 text-orange-400" />
                      <label className="text-white font-semibold">
                        Example Payload
                      </label>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-600/50 rounded-lg p-4">
                      <pre className="text-xs text-slate-300 font-mono overflow-x-auto">
                        {`{
  "event_type": "webhook.received",
  "data": {
    "message": "Hello from webhook",
    "timestamp": "2024-01-01T12:00:00Z"
  },
  "source": "external-service",
  "correlation_id": "req_123456"
}`}
                      </pre>
                    </div>
                    <div className="text-xs text-slate-400 mt-2">
                      Standard webhook payload format with metadata
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  {/* Authentication Settings */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Shield className="w-5 h-5 text-emerald-400" />
                      <label className="text-white font-semibold">
                        Authentication
                      </label>
                    </div>

                    <ToggleField
                      name="authentication_required"
                      icon={<Lock className="w-4 h-4" />}
                      label="Require Authentication"
                      description="Require bearer token authentication for webhook calls"
                    />

                    <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-600/30">
                      <div className="flex items-center space-x-2 mb-2">
                        <Key className="w-4 h-4 text-emerald-400" />
                        <span className="text-slate-300 text-sm font-medium">
                          Security Best Practices
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1">
                        <div>• Use strong, unique tokens for each webhook</div>
                        <div>
                          • Rotate tokens regularly for enhanced security
                        </div>
                        <div>• Validate webhook signatures when possible</div>
                        <div>
                          • Monitor webhook activity for suspicious patterns
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CORS Configuration */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Globe className="w-5 h-5 text-blue-400" />
                      <label className="text-white font-semibold">
                        Cross-Origin Settings
                      </label>
                    </div>

                    <ToggleField
                      name="enable_cors"
                      icon={<Globe className="w-4 h-4" />}
                      label="Enable CORS"
                      description="Enable CORS for cross-origin requests"
                    />

                    <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-600/30">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertCircle className="w-4 h-4 text-blue-400" />
                        <span className="text-slate-300 text-sm font-medium">
                          CORS Considerations
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1">
                        <div>• Required for browser-based webhook calls</div>
                        <div>
                          • May be needed for certain third-party integrations
                        </div>
                        <div>
                          • Consider security implications in production
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Security Information */}
                  <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl p-6 border border-orange-500/20">
                    <div className="flex items-center space-x-2 mb-4">
                      <AlertCircle className="w-5 h-5 text-orange-400" />
                      <label className="text-white font-semibold">
                        Security Notes
                      </label>
                    </div>
                    <div className="text-xs text-slate-300 space-y-2">
                      <div className="flex items-start space-x-2">
                        <span className="text-orange-400">•</span>
                        <span>
                          Keep webhook tokens secure and never expose them in
                          client-side code
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-orange-400">•</span>
                        <span>
                          Validate payload size to prevent DoS attacks
                        </span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-orange-400">•</span>
                        <span>Monitor rate limits to prevent abuse</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <span className="text-orange-400">•</span>
                        <span>Always use HTTPS in production environments</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Advanced Tab */}
              {activeTab === "advanced" && (
                <div className="space-y-6">
                  {/* Performance Settings */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      <label className="text-white font-semibold">
                        Performance Settings
                      </label>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          Max Payload Size:{" "}
                          <span className="text-yellow-400 font-mono">
                            {values.max_payload_size} KB
                          </span>
                        </label>
                        <Field
                          type="range"
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-yellow-500
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                          name="max_payload_size"
                          min="1"
                          max="10240"
                          step="1"
                        />
                        <div className="text-xs text-slate-400 mt-1">
                          Maximum payload size in KB (1-10240)
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          Rate Limit:{" "}
                          <span className="text-yellow-400 font-mono">
                            {values.rate_limit_per_minute} req/min
                          </span>
                        </label>
                        <Field
                          type="range"
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-yellow-500
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                          name="rate_limit_per_minute"
                          min="0"
                          max="1000"
                          step="10"
                        />
                        <div className="text-xs text-slate-400 mt-1">
                          Maximum requests per minute (0 = no limit)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeout Settings */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Clock className="w-5 h-5 text-cyan-400" />
                      <label className="text-white font-semibold">
                        Timeout Settings
                      </label>
                    </div>

                    <div>
                      <label className="text-slate-300 text-sm mb-2 block">
                        Webhook Timeout:{" "}
                        <span className="text-cyan-400 font-mono">
                          {values.webhook_timeout}s
                        </span>
                      </label>
                      <Field
                        type="range"
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                          [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-cyan-500
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                        name="webhook_timeout"
                        min="5"
                        max="300"
                        step="5"
                      />
                      <div className="text-xs text-slate-400 mt-1">
                        Webhook processing timeout in seconds (5-300)
                      </div>
                    </div>

                    <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-600/30">
                      <div className="flex items-center space-x-2 mb-2">
                        <BarChart3 className="w-4 h-4 text-cyan-400" />
                        <span className="text-slate-300 text-sm font-medium">
                          Performance Guidelines
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1">
                        <div>
                          • Set appropriate timeouts based on your processing
                          needs
                        </div>
                        <div>
                          • Monitor webhook processing times and adjust
                          accordingly
                        </div>
                        <div>
                          • Consider implementing retry logic for failed
                          webhooks
                        </div>
                        <div>
                          • Use rate limiting to prevent system overload
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Monitoring and Analytics */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Activity className="w-5 h-5 text-purple-400" />
                      <label className="text-white font-semibold">
                        Monitoring & Analytics
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-600/30">
                        <div className="flex items-center space-x-2 mb-2">
                          <Eye className="w-4 h-4 text-purple-400" />
                          <span className="text-slate-300 text-sm font-medium">
                            Webhook Metrics
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 space-y-1">
                          <div>• Request volume and patterns</div>
                          <div>• Response times and success rates</div>
                          <div>• Error rates and failure reasons</div>
                          <div>• Authentication and security events</div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-600/30">
                        <div className="flex items-center space-x-2 mb-2">
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          <span className="text-slate-300 text-sm font-medium">
                            Best Practices
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 space-y-1">
                          <div>• Implement comprehensive logging</div>
                          <div>• Set up alerting for anomalies</div>
                          <div>• Regular security audits</div>
                          <div>• Performance optimization</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-slate-700/50">
                <button
                  type="button"
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg 
                    border border-slate-600 transition-all duration-200 hover:scale-105
                    flex items-center space-x-2"
                  onClick={() => dialogRef.current?.close()}
                  disabled={isSubmitting}
                >
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-600 
                    hover:from-purple-400 hover:to-pink-500 text-white rounded-lg 
                    shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105
                    flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Save Configuration</span>
                    </>
                  )}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </dialog>
  );
});

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
