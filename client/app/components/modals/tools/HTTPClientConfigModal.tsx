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
} from "lucide-react";

interface HTTPClientConfigModalProps {
  nodeData: any;
  onSave: (data: any) => void;
  nodeId: string;
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
  timeout: number;
  max_retries: number;
  retry_delay: number;
  follow_redirects: boolean;
  verify_ssl: boolean;
  enable_templating: boolean;
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
    description:
      "Update resource completely • Idempotent • Best for full updates",
    icon: "🔄",
    color: "from-orange-500 to-amber-500",
  },
  {
    value: "PATCH",
    label: "PATCH",
    description:
      "Partially update resource • Efficient • Best for partial updates",
    icon: "🔧",
    color: "from-purple-500 to-pink-500",
  },
  {
    value: "DELETE",
    label: "DELETE",
    description:
      "Remove resource from server • Idempotent • Best for deletions",
    icon: "🗑️",
    color: "from-red-500 to-rose-500",
  },
  {
    value: "HEAD",
    label: "HEAD",
    description: "Get response headers only • Lightweight • Best for metadata",
    icon: "📋",
    color: "from-gray-500 to-slate-500",
  },
  {
    value: "OPTIONS",
    label: "OPTIONS",
    description: "Get allowed methods • CORS support • Best for preflight",
    icon: "❓",
    color: "from-indigo-500 to-blue-500",
  },
];

// Content Type Options with enhanced descriptions
const CONTENT_TYPES = [
  {
    value: "json",
    label: "JSON ⭐",
    description: "application/json • Structured data • Most common for APIs",
    icon: "📊",
  },
  {
    value: "form",
    label: "Form Data",
    description:
      "application/x-www-form-urlencoded • Traditional forms • Legacy support",
    icon: "📝",
  },
  {
    value: "xml",
    label: "XML",
    description: "application/xml • Structured markup • Enterprise systems",
    icon: "📄",
  },
  {
    value: "text",
    label: "Plain Text",
    description: "text/plain • Simple text • Minimal overhead",
    icon: "📝",
  },
  {
    value: "html",
    label: "HTML",
    description: "text/html • Web content • Browser rendering",
    icon: "🌐",
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
>(({ nodeData, onSave, nodeId }, ref) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useImperativeHandle(ref, () => dialogRef.current!);
  const [activeTab, setActiveTab] = useState("basic");

  const initialValues: HTTPClientConfig = {
    method: nodeData?.method || "GET",
    url: nodeData?.url || "",
    headers: nodeData?.headers || "{}",
    url_params: nodeData?.url_params || "{}",
    body: nodeData?.body || "",
    content_type: nodeData?.content_type || "json",
    auth_type: nodeData?.auth_type || "none",
    auth_token: nodeData?.auth_token || "",
    auth_username: nodeData?.auth_username || "",
    auth_password: nodeData?.auth_password || "",
    api_key_header: nodeData?.api_key_header || "X-API-Key",
    timeout: nodeData?.timeout || 30,
    max_retries: nodeData?.max_retries || 3,
    retry_delay: nodeData?.retry_delay || 1.0,
    follow_redirects: nodeData?.follow_redirects !== false,
    verify_ssl: nodeData?.verify_ssl !== false,
    enable_templating: nodeData?.enable_templating !== false,
  };

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-bottom sm:modal-middle backdrop-blur-sm"
    >
      <div
        className="modal-box max-w-5xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 
        border border-slate-700/50 shadow-2xl shadow-blue-500/10 backdrop-blur-xl"
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
              HTTP Client Configuration
            </h3>
            <p className="text-slate-400 text-sm">
              Configure HTTP request settings and authentication
            </p>
          </div>
        </div>

        <Formik
          initialValues={initialValues}
          enableReinitialize
          validate={(values) => {
            const errors: Record<string, string> = {};
            if (!values.url) {
              errors.url = "URL is required.";
            }
            return errors;
          }}
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
                  { id: "auth", label: "Authentication", icon: Key },
                  { id: "advanced", label: "Advanced", icon: Zap },
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

              {/* Basic Configuration Tab */}
              {activeTab === "basic" && (
                <div className="space-y-6">
                  {/* Request Configuration */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <ArrowUpCircle className="w-5 h-5 text-blue-400" />
                      <label className="text-white font-semibold">
                        Request Configuration
                      </label>
                    </div>

                    <div className="flex flex-col gap-4">
                      {/* HTTP Method */}
                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          HTTP Method
                        </label>
                        <Field
                          as="select"
                          className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                            text-white px-4 py-3 focus:border-blue-500 focus:ring-2 
                            focus:ring-blue-500/20 transition-all"
                          name="method"
                        >
                          {HTTP_METHODS.map((method) => (
                            <option key={method.value} value={method.value}>
                              {method.icon} {method.label}
                            </option>
                          ))}
                        </Field>
                        <div className="mt-2 p-2 bg-slate-900/30 rounded text-xs text-slate-400">
                          {
                            HTTP_METHODS.find((m) => m.value === values.method)
                              ?.description
                          }
                        </div>
                      </div>

                      {/* URL */}
                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          URL
                        </label>
                        <Field
                          className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                            text-white placeholder-slate-400 px-4 py-3 focus:border-blue-500 focus:ring-2 
                            focus:ring-blue-500/20 transition-all"
                          name="url"
                          placeholder="https://api.example.com/endpoint"
                        />
                        <ErrorMessage
                          name="url"
                          component="div"
                          className="text-red-400 text-sm mt-2"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Headers and Parameters */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Hash className="w-5 h-5 text-purple-400" />
                      <label className="text-white font-semibold">
                        Headers & Parameters
                      </label>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          Headers (JSON)
                        </label>
                        <Field
                          as="textarea"
                          className="w-full h-24 bg-slate-900/80 border border-slate-600/50 rounded-lg 
                            text-white placeholder-slate-400 px-4 py-3 focus:border-purple-500 focus:ring-2 
                            focus:ring-purple-500/20 transition-all resize-none font-mono text-sm"
                          name="headers"
                          placeholder='{"Content-Type": "application/json", "User-Agent": "KAI-Fusion/1.0"}'
                        />
                        <div className="text-xs text-slate-400 mt-1">
                          Request headers as JSON object
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          URL Parameters (JSON)
                        </label>
                        <Field
                          as="textarea"
                          className="w-full h-24 bg-slate-900/80 border border-slate-600/50 rounded-lg 
                            text-white placeholder-slate-400 px-4 py-3 focus:border-purple-500 focus:ring-2 
                            focus:ring-purple-500/20 transition-all resize-none font-mono text-sm"
                          name="url_params"
                          placeholder='{"page": 1, "limit": 10, "sort": "created_at"}'
                        />
                        <div className="text-xs text-slate-400 mt-1">
                          Query parameters as JSON object
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Request Body and Content Type */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Code className="w-5 h-5 text-green-400" />
                      <label className="text-white font-semibold">
                        Request Body
                      </label>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          Request Body
                        </label>
                        <Field
                          as="textarea"
                          className="w-full h-24 bg-slate-900/80 border border-slate-600/50 rounded-lg 
                            text-white placeholder-slate-400 px-4 py-3 focus:border-green-500 focus:ring-2 
                            focus:ring-green-500/20 transition-all resize-none font-mono text-sm"
                          name="body"
                          placeholder='{"key": "value", "data": "example"}'
                        />
                        <div className="text-xs text-slate-400 mt-1">
                          Request body (supports Jinja2 templating)
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          Content Type
                        </label>
                        <Field
                          as="select"
                          className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                            text-white px-4 py-3 focus:border-green-500 focus:ring-2 
                            focus:ring-green-500/20 transition-all"
                          name="content_type"
                        >
                          {CONTENT_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.icon} {type.label}
                            </option>
                          ))}
                        </Field>
                        <div className="mt-2 p-2 bg-slate-900/30 rounded text-xs text-slate-400">
                          {
                            CONTENT_TYPES.find(
                              (t) => t.value === values.content_type
                            )?.description
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Authentication Tab */}
              {activeTab === "auth" && (
                <div className="space-y-6">
                  {/* Authentication Type */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Key className="w-5 h-5 text-emerald-400" />
                      <label className="text-white font-semibold">
                        Authentication
                      </label>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          Authentication Type
                        </label>
                        <Field
                          as="select"
                          className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                            text-white px-4 py-3 focus:border-emerald-500 focus:ring-2 
                            focus:ring-emerald-500/20 transition-all"
                          name="auth_type"
                        >
                          {AUTH_TYPES.map((auth) => (
                            <option key={auth.value} value={auth.value}>
                              {auth.icon} {auth.label}
                            </option>
                          ))}
                        </Field>
                        <div className="mt-2 p-2 bg-slate-900/30 rounded text-xs text-slate-400">
                          {
                            AUTH_TYPES.find((a) => a.value === values.auth_type)
                              ?.description
                          }
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          Auth Token/API Key
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <Field
                            className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                              text-white pl-10 pr-4 py-3 focus:border-emerald-500 focus:ring-2 
                              focus:ring-emerald-500/20 transition-all"
                            type="password"
                            name="auth_token"
                            placeholder="your-token-or-api-key"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Basic Auth Fields */}
                  {values.auth_type === "basic" && (
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                      <div className="flex items-center space-x-2 mb-4">
                        <Shield className="w-5 h-5 text-blue-400" />
                        <label className="text-white font-semibold">
                          Basic Authentication
                        </label>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <label className="text-slate-300 text-sm mb-2 block">
                            Username
                          </label>
                          <Field
                            className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                              text-white placeholder-slate-400 px-4 py-3 focus:border-blue-500 focus:ring-2 
                              focus:ring-blue-500/20 transition-all"
                            name="auth_username"
                            placeholder="username"
                          />
                        </div>
                        <div>
                          <label className="text-slate-300 text-sm mb-2 block">
                            Password
                          </label>
                          <Field
                            className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                              text-white placeholder-slate-400 px-4 py-3 focus:border-blue-500 focus:ring-2 
                              focus:ring-blue-500/20 transition-all"
                            type="password"
                            name="auth_password"
                            placeholder="password"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* API Key Header */}
                  {values.auth_type === "api_key" && (
                    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                      <div className="flex items-center space-x-2 mb-4">
                        <Hash className="w-5 h-5 text-purple-400" />
                        <label className="text-white font-semibold">
                          API Key Configuration
                        </label>
                      </div>

                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          API Key Header Name
                        </label>
                        <Field
                          className="w-full bg-slate-900/80 border border-slate-600/50 rounded-lg 
                            text-white placeholder-slate-400 px-4 py-3 focus:border-purple-500 focus:ring-2 
                            focus:ring-purple-500/20 transition-all"
                          name="api_key_header"
                          placeholder="X-API-Key"
                        />
                        <div className="text-xs text-slate-400 mt-1">
                          Header name for API key (e.g., 'X-API-Key',
                          'Authorization')
                        </div>
                      </div>
                    </div>
                  )}
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

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          Timeout:{" "}
                          <span className="text-yellow-400 font-mono">
                            {values.timeout}s
                          </span>
                        </label>
                        <Field
                          type="range"
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-yellow-500
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                          name="timeout"
                          min="1"
                          max="300"
                          step="1"
                        />
                        <div className="text-xs text-slate-400 mt-1">
                          Request timeout in seconds
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          Max Retries:{" "}
                          <span className="text-yellow-400 font-mono">
                            {values.max_retries}
                          </span>
                        </label>
                        <Field
                          type="range"
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-yellow-500
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                          name="max_retries"
                          min="0"
                          max="10"
                          step="1"
                        />
                        <div className="text-xs text-slate-400 mt-1">
                          Maximum retry attempts
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-300 text-sm mb-2 block">
                          Retry Delay:{" "}
                          <span className="text-yellow-400 font-mono">
                            {values.retry_delay}s
                          </span>
                        </label>
                        <Field
                          type="range"
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-yellow-500
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                          name="retry_delay"
                          min="0.1"
                          max="10.0"
                          step="0.1"
                        />
                        <div className="text-xs text-slate-400 mt-1">
                          Delay between retries
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Processing Options */}
                  <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
                    <div className="flex items-center space-x-2 mb-4">
                      <Settings className="w-5 h-5 text-orange-400" />
                      <label className="text-white font-semibold">
                        Processing Options
                      </label>
                    </div>

                    <div className="space-y-3">
                      <ToggleField
                        name="follow_redirects"
                        icon={<ArrowUpCircle className="w-4 h-4" />}
                        label="Follow Redirects"
                        description="Follow HTTP redirects automatically"
                      />
                      <ToggleField
                        name="verify_ssl"
                        icon={<Shield className="w-4 h-4" />}
                        label="Verify SSL"
                        description="Verify SSL certificates for security"
                      />
                      <ToggleField
                        name="enable_templating"
                        icon={<Code className="w-4 h-4" />}
                        label="Enable Templating"
                        description="Enable Jinja2 templating for URL and body"
                      />
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
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 
                    hover:from-blue-400 hover:to-purple-500 text-white rounded-lg 
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
            peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-purple-600"
          ></div>
        </label>
      </div>
    )}
  </Field>
);

export default HTTPClientConfigModal;
