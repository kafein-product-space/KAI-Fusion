import React, { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  Database,
  Settings,
  Shield,
  Activity,
  Copy,
  TestTube,
  CheckCircle,
  AlertTriangle,
  Clock,
  Key,
  MessageSquare,
  Server,
  Filter,
  Code,
  Play,
  Users,
} from "lucide-react";
import type { KafkaConsumerConfig, KafkaMessage, KafkaConsumerStats } from "./types";
import TabNavigation from "~/components/common/TabNavigation";

// Utility functions
const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const formatMessageCount = (count: number): string => {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
};

interface KafkaConsumerConfigFormProps {
  configData: KafkaConsumerConfig;
  onSave: (values: Partial<KafkaConsumerConfig>) => void;
  onCancel: () => void;
  isTesting?: boolean;
  testMessages?: KafkaMessage[];
  testError?: string | null;
  stats?: KafkaConsumerStats | null;
  isConnected?: boolean;
  onTestConnection?: () => void;
  onCopyToClipboard?: (text: string, type: string) => void;
  generateKafkaCliCommand?: () => string;
}

export default function KafkaConsumerConfigForm({
  configData,
  onSave,
  onCancel,
  isTesting = false,
  testMessages = [],
  testError,
  stats,
  isConnected = false,
  onTestConnection,
  onCopyToClipboard,
  generateKafkaCliCommand,
}: KafkaConsumerConfigFormProps) {
  const [activeTab, setActiveTab] = useState("basic");

  const tabs = [
    {
      id: "basic",
      label: "Basic",
      icon: Settings,
      description: "Basic Kafka configuration",
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
      icon: Activity,
      description: "Performance and optimization settings",
    },
    {
      id: "test",
      label: "Test",
      icon: TestTube,
      description: "Test connection and consume messages",
    },
  ];

  const MESSAGE_FORMATS = [
    { value: "json", label: "JSON", description: "JSON formatted messages" },
    { value: "text", label: "Text", description: "Plain text messages" },
    { value: "binary", label: "Binary", description: "Binary data messages" },
  ];

  const OFFSET_RESET_OPTIONS = [
    { value: "earliest", label: "Earliest", description: "Start from beginning of topic" },
    { value: "latest", label: "Latest", description: "Start from end of topic (new messages only)" },
  ];

  const SECURITY_PROTOCOLS = [
    { value: "PLAINTEXT", label: "Plain Text", description: "No encryption" },
    { value: "SSL", label: "SSL", description: "SSL encryption" },
    { value: "SASL_PLAINTEXT", label: "SASL Plain", description: "SASL authentication" },
    { value: "SASL_SSL", label: "SASL SSL", description: "SASL auth + SSL encryption" },
  ];

  return (
    <div className="w-full h-full">
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
          if (!values.bootstrap_servers) {
            errors.bootstrap_servers = "Bootstrap servers are required";
          }
          if (!values.topic) {
            errors.topic = "Topic is required";
          }
          if (values.timeout_ms && values.timeout_ms < 1000) {
            errors.timeout_ms = "Timeout must be at least 1000ms";
          }
          if (values.batch_size && values.batch_size < 1) {
            errors.batch_size = "Batch size must be at least 1";
          }
          return errors;
        }}
        onSubmit={(values) => onSave(values)}
      >
        {({ values, errors, touched, isSubmitting, setFieldValue }) => (
          <Form className="flex-1 flex flex-col">
            <div className="flex-1 p-6 space-y-8 overflow-y-auto">
              {/* Basic Tab */}
              {activeTab === "basic" && (
                <div className="space-y-4">
                  {/* Connection Settings */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Connection Settings
                    </h3>

                    {/* Bootstrap Servers */}
                    <div className="mb-3">
                      <label className="text-white text-sm font-medium mb-2 block">
                        Bootstrap Servers
                      </label>
                      <Field
                        name="bootstrap_servers"
                        placeholder="localhost:9092,kafka2:9092,kafka3:9092"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                      />
                      <ErrorMessage
                        name="bootstrap_servers"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                      <p className="text-gray-400 text-xs mt-1">
                        Comma-separated list of Kafka broker addresses
                      </p>
                    </div>

                    {/* Topic */}
                    <div className="mb-3">
                      <label className="text-white text-sm font-medium mb-2 block">
                        Topic
                      </label>
                      <Field
                        name="topic"
                        placeholder="user-events"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                      <ErrorMessage
                        name="topic"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                    </div>

                    {/* Consumer Group */}
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Consumer Group ID
                      </label>
                      <Field
                        name="group_id"
                        placeholder="kai-fusion-group (auto-generated if empty)"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                      <p className="text-gray-400 text-xs mt-1">
                        Leave empty for auto-generated group ID
                      </p>
                    </div>
                  </div>

                  {/* Message Settings */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Message Settings
                    </h3>

                    {/* Message Format */}
                    <div className="mb-3">
                      <label className="text-white text-sm font-medium mb-2 block">
                        Message Format
                      </label>
                      <Field
                        as="select"
                        name="message_format"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        {MESSAGE_FORMATS.map((format) => (
                          <option key={format.value} value={format.value}>
                            {format.label} - {format.description}
                          </option>
                        ))}
                      </Field>
                    </div>

                    {/* Offset Reset */}
                    <div className="mb-3">
                      <label className="text-white text-sm font-medium mb-2 block">
                        Auto Offset Reset
                      </label>
                      <Field
                        as="select"
                        name="auto_offset_reset"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        {OFFSET_RESET_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label} - {option.description}
                          </option>
                        ))}
                      </Field>
                    </div>

                    {/* Batch Size */}
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Batch Size
                      </label>
                      <Field
                        type="number"
                        name="batch_size"
                        min="1"
                        max="10000"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                      <ErrorMessage
                        name="batch_size"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                    </div>
                  </div>

                  {/* Auto Commit */}
                  <div>
                    <div className="flex items-center gap-2">
                      <Field
                        type="checkbox"
                        name="enable_auto_commit"
                        className="w-4 h-4 text-blue-600 bg-slate-900 border-white/20 rounded focus:ring-blue-500"
                      />
                      <label className="text-white text-sm">
                        Enable Auto Commit
                      </label>
                    </div>
                    <p className="text-gray-400 text-xs mt-1">
                      Automatically commit message offsets
                    </p>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-4">
                  {/* Security Protocol */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Security Protocol
                    </h3>
                    <Field
                      as="select"
                      name="security_protocol"
                      className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      {SECURITY_PROTOCOLS.map((protocol) => (
                        <option key={protocol.value} value={protocol.value}>
                          {protocol.label} - {protocol.description}
                        </option>
                      ))}
                    </Field>
                  </div>

                  {/* SASL Authentication */}
                  {(values.security_protocol === "SASL_PLAINTEXT" ||
                    values.security_protocol === "SASL_SSL") && (
                    <div>
                      <h3 className="text-white text-sm font-medium mb-3">
                        SASL Authentication
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-white text-sm font-medium mb-2 block">
                            Username
                          </label>
                          <Field
                            name="username"
                            className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-white text-sm font-medium mb-2 block">
                            Password
                          </label>
                          <Field
                            name="password"
                            type="password"
                            className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Performance Tab */}
              {activeTab === "performance" && (
                <div className="space-y-4">
                  {/* Timeout Settings */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Timeout Settings
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">
                          Consumer Timeout (ms)
                        </label>
                        <Field
                          type="number"
                          name="timeout_ms"
                          min="1000"
                          max="300000"
                          className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                        <ErrorMessage
                          name="timeout_ms"
                          component="div"
                          className="text-red-400 text-sm mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">
                          Max Poll Records
                        </label>
                        <Field
                          type="number"
                          name="max_poll_records"
                          min="1"
                          max="10000"
                          className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Message Limit */}
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Max Messages (0 = unlimited)
                    </label>
                    <Field
                      type="number"
                      name="max_messages"
                      min="0"
                      max="1000000"
                      className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Advanced Processing */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Advanced Processing
                    </h3>

                    {/* Message Filter */}
                    <div className="mb-3">
                      <label className="text-white text-sm font-medium mb-2 block">
                        Message Filter (JSONPath)
                      </label>
                      <Field
                        name="message_filter"
                        placeholder="$.event_type"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                      />
                      <p className="text-gray-400 text-xs mt-1">
                        Filter messages using JSONPath expressions
                      </p>
                    </div>

                    {/* Transform Template */}
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Transform Template (Jinja2)
                      </label>
                      <Field
                        as="textarea"
                        name="transform_template"
                        placeholder='{"processed_message": "{{ message }}", "timestamp": "{{ timestamp }}"}'
                        rows={3}
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                      />
                      <p className="text-gray-400 text-xs mt-1">
                        Transform messages using Jinja2 templates
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Test Tab */}
              {activeTab === "test" && (
                <div className="space-y-4">
                  {/* Test Controls */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white text-sm font-medium">
                        Connection Test
                      </h3>
                      <div className="flex gap-2">
                        {onTestConnection && (
                          <button
                            type="button"
                            onClick={onTestConnection}
                            disabled={isTesting || !values.bootstrap_servers || !values.topic}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
                          >
                            <Play className="w-3 h-3" />
                            {isTesting ? "Testing..." : "Test Connection"}
                          </button>
                        )}
                        {generateKafkaCliCommand && onCopyToClipboard && (
                          <button
                            type="button"
                            onClick={() =>
                              onCopyToClipboard(generateKafkaCliCommand(), "Kafka CLI")
                            }
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                            CLI
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Test Results */}
                    {isConnected && testMessages.length > 0 && (
                      <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 text-sm font-medium">
                            Connection Successful - {testMessages.length} messages consumed
                          </span>
                        </div>

                        {/* Messages */}
                        <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
                          {testMessages.slice(0, 5).map((message, index) => (
                            <div key={index} className="bg-green-900/30 rounded p-2 border border-green-500/20">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-green-300 text-xs font-mono">
                                  {message.key || "null"}
                                </span>
                                <span className="text-green-400 text-xs">
                                  Partition: {message.partition}, Offset: {message.offset}
                                </span>
                              </div>
                              <div className="text-green-200 text-xs font-mono break-words">
                                {typeof message.value === "object"
                                  ? JSON.stringify(message.value, null, 2)
                                  : String(message.value)}
                              </div>
                              {message.headers && Object.keys(message.headers).length > 0 && (
                                <div className="mt-1 text-green-300 text-xs">
                                  Headers: {JSON.stringify(message.headers)}
                                </div>
                              )}
                            </div>
                          ))}
                          {testMessages.length > 5 && (
                            <div className="text-green-400 text-xs text-center">
                              +{testMessages.length - 5} more messages...
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Statistics */}
                    {stats && (
                      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-400 text-sm font-medium">
                            Consumer Statistics
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-blue-300 mb-1">Messages Received:</div>
                            <div className="text-blue-200 font-mono">
                              {formatMessageCount(stats.messages_received)}
                            </div>
                          </div>
                          <div>
                            <div className="text-blue-300 mb-1">Consumer Group:</div>
                            <div className="text-blue-200 font-mono truncate">
                              {stats.group_id}
                            </div>
                          </div>
                          <div>
                            <div className="text-blue-300 mb-1">Errors:</div>
                            <div className={`font-mono ${stats.metrics.errors > 0 ? "text-red-400" : "text-blue-200"}`}>
                              {stats.metrics.errors}
                            </div>
                          </div>
                          <div>
                            <div className="text-blue-300 mb-1">Last Activity:</div>
                            <div className="text-blue-200 text-xs">
                              {stats.metrics.last_activity ? new Date(stats.metrics.last_activity).toLocaleTimeString() : "Never"}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {testError && (
                      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <span className="text-red-400 text-sm font-medium">
                            Connection Error
                          </span>
                        </div>
                        <div className="text-red-300 text-sm">{testError}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-600">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
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