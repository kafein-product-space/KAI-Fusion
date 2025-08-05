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
  onCopyToClipboard,
}: WebhookTriggerConfigFormProps) {
  const [activeTab, setActiveTab] = useState("basic");

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
      id: "testing",
      label: "Testing",
      icon: TestTube,
      description: "Test webhook and view events",
    },
  ];

  const generateCurlCommand = () => {
    if (!webhookEndpoint) return "";
    return `curl -X POST "${webhookEndpoint}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${webhookToken}" \\
  -d '{"test": "data", "timestamp": "${new Date().toISOString()}"}'`;
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

                {/* Testing Configuration Tab */}
                {activeTab === "testing" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-yellow-400 uppercase tracking-wider">
                      <TestTube className="w-3 h-3" />
                      <span>Testing & Events</span>
                    </div>

                    {/* Webhook Endpoint Display */}
                    <div>
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
                          Send POST requests to this URL to trigger the webhook
                        </div>
                      </div>
                    </div>

                    {/* Test Event Button */}
                    <div>
                      <button
                        type="button"
                        onClick={onTestEvent}
                        disabled={isListening}
                        className="btn btn-sm w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-400 hover:to-orange-500 text-white border-0"
                      >
                        <TestTube className="w-3 h-3 mr-1" />
                        {isListening ? "Listening..." : "Start Listening"}
                      </button>
                    </div>

                    {/* Stream Status */}
                    <div className="bg-slate-800/50 p-2 rounded text-xs text-white">
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
                      <div>
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
                              onCopyToClipboard?.(generateCurlCommand(), "curl")
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
                                  {new Date(
                                    event.timestamp
                                  ).toLocaleTimeString()}
                                </span>
                              </div>
                              <div className="text-slate-300 truncate">
                                {JSON.stringify(event.data).substring(0, 50)}...
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
