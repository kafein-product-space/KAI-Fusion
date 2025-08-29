import React, { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  Download,
  Settings,
  Shield,
  Zap,
  TestTube,
  Database,
  MessageSquare,
  Key,
  Lock,
  Globe,
  CheckCircle,
  AlertTriangle,
  Copy,
  Play,
  Clock,
  BarChart3,
  FileText,
  Hash,
  Users,
  Filter,
  Code,
  Activity,
  Pause,
} from "lucide-react";
import type { KafkaConsumerConfig } from "./types";
import TabNavigation from "~/components/common/TabNavigation";

// Utility functions for formatting
const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

interface KafkaConsumerConfigFormProps {
  configData: KafkaConsumerConfig;
  onSave: (values: Partial<KafkaConsumerConfig>) => void;
  onCancel: () => void;
  isConsuming?: boolean;
  isTesting?: boolean;
  testResponse?: any;
  testError?: string | null;
  testStats?: any;
  onStartConsumer?: () => void;
  onStopConsumer?: () => void;
  onTestConsumer?: () => void;
  onCopyToClipboard?: (text: string, type: string) => void;
  generateKafkaCommand?: () => string;
}

export default function KafkaConsumerConfigForm({
  configData,
  onSave,
  onCancel,
  isConsuming = false,
  isTesting = false,
  testResponse,
  testError,
  testStats,
  onStartConsumer,
  onStopConsumer,
  onTestConsumer,
  onCopyToClipboard,
  generateKafkaCommand,
}: KafkaConsumerConfigFormProps) {
  const [activeTab, setActiveTab] = useState("basic");

  const tabs = [
    {
      id: "basic",
      label: "Basic",
      icon: Settings,
      description: "Basic Kafka consumer configuration",
    },
    {
      id: "consumer",
      label: "Consumer",
      icon: Users,
      description: "Consumer group and offset settings",
    },
    {
      id: "message",
      label: "Message",
      icon: MessageSquare,
      description: "Message processing and filtering",
    },
    {
      id: "performance",
      label: "Performance",
      icon: Zap,
      description: "Performance and optimization settings",
    },
    {
      id: "security",
      label: "Security",
      icon: Shield,
      description: "Security and authentication settings",
    },
    {
      id: "test",
      label: "Test",
      icon: TestTube,
      description: "Test message consumption",
    },
  ];

  const OFFSET_RESET_POLICIES = [
    {
      value: "earliest",
      label: "Earliest",
      description: "Start from beginning of topic",
      icon: Database,
    },
    {
      value: "latest",
      label: "Latest",
      description: "Start from end of topic (new messages only)",
      icon: Activity,
    },
  ];

  const MESSAGE_FORMATS = [
    { value: "json", label: "JSON", description: "JSON formatted messages" },
    { value: "text", label: "Text", description: "Plain text messages" },
    { value: "binary", label: "Binary", description: "Binary data messages" },
    { value: "avro", label: "Avro", description: "Avro serialized messages" },
  ];

  const SECURITY_PROTOCOLS = [
    { value: "PLAINTEXT", label: "Plain Text", description: "No encryption" },
    { value: "SSL", label: "SSL", description: "SSL encryption" },
    {
      value: "SASL_PLAINTEXT",
      label: "SASL Plain",
      description: "SASL authentication",
    },
    {
      value: "SASL_SSL",
      label: "SASL SSL",
      description: "SASL auth + SSL encryption",
    },
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
                  {/* Bootstrap Servers */}
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Bootstrap Servers
                    </label>
                    <Field
                      name="bootstrap_servers"
                      placeholder="localhost:9092,broker2:9092"
                      className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                    <ErrorMessage
                      name="bootstrap_servers"
                      component="div"
                      className="text-red-400 text-sm mt-1"
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      Comma-separated list of Kafka broker addresses
                    </div>
                  </div>

                  {/* Topic */}
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Topic Name
                    </label>
                    <Field
                      name="topic"
                      placeholder="my-topic"
                      className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                    <ErrorMessage
                      name="topic"
                      component="div"
                      className="text-red-400 text-sm mt-1"
                    />
                  </div>

                  {/* Message Format */}
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Message Format
                    </label>
                    <Field
                      as="select"
                      name="message_format"
                      className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      {MESSAGE_FORMATS.map((format) => (
                        <option key={format.value} value={format.value}>
                          {format.label} - {format.description}
                        </option>
                      ))}
                    </Field>
                  </div>

                  {/* Batch Size and Timeout */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Batch Size
                      </label>
                      <Field
                        type="number"
                        name="batch_size"
                        min="1"
                        max="10000"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                      <ErrorMessage
                        name="batch_size"
                        component="div"
                        className="text-red-400 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Timeout (ms)
                      </label>
                      <Field
                        type="number"
                        name="timeout_ms"
                        min="1000"
                        max="300000"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Consumer Tab */}
              {activeTab === "consumer" && (
                <div className="space-y-4">
                  {/* Consumer Group ID */}
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Consumer Group ID
                    </label>
                    <Field
                      name="group_id"
                      placeholder="my-consumer-group (auto-generated if empty)"
                      className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      Leave empty to auto-generate a unique group ID
                    </div>
                  </div>

                  {/* Auto Offset Reset */}
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Auto Offset Reset
                    </label>
                    <Field
                      as="select"
                      name="auto_offset_reset"
                      className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      {OFFSET_RESET_POLICIES.map((policy) => (
                        <option key={policy.value} value={policy.value}>
                          {policy.label} - {policy.description}
                        </option>
                      ))}
                    </Field>
                  </div>

                  {/* Auto Commit Settings */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Field
                        type="checkbox"
                        name="enable_auto_commit"
                        className="w-4 h-4 text-indigo-600 bg-slate-900 border-white/20 rounded focus:ring-indigo-500"
                      />
                      <label className="text-white text-sm">
                        Enable Auto Commit
                      </label>
                    </div>

                    {values.enable_auto_commit && (
                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">
                          Auto Commit Interval (ms)
                        </label>
                        <Field
                          type="number"
                          name="auto_commit_interval_ms"
                          min="1000"
                          max="60000"
                          className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Session and Heartbeat Settings */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Session Timeout (ms)
                      </label>
                      <Field
                        type="number"
                        name="session_timeout_ms"
                        min="6000"
                        max="300000"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Heartbeat Interval (ms)
                      </label>
                      <Field
                        type="number"
                        name="heartbeat_interval_ms"
                        min="1000"
                        max="10000"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Max Messages */}
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Max Messages (0 = unlimited)
                    </label>
                    <Field
                      type="number"
                      name="max_messages"
                      min="0"
                      max="1000000"
                      className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      Set to 0 for unlimited message consumption
                    </div>
                  </div>
                </div>
              )}

              {/* Message Tab */}
              {activeTab === "message" && (
                <div className="space-y-4">
                  {/* Message Filter */}
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Message Filter (JSONPath)
                    </label>
                    <Field
                      name="message_filter"
                      placeholder="$.event_type"
                      className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      JSONPath expression to filter messages (e.g.,
                      $.event_type, $.data.status)
                    </div>
                  </div>

                  {/* Transform Template */}
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Transform Template (Jinja2)
                    </label>
                    <Field
                      as="textarea"
                      name="transform_template"
                      placeholder={`{
  "processed_at": "{{ timestamp }}",
  "original": {{ message | tojson }},
  "type": "{{ message.event_type | default('unknown') }}"
}`}
                      rows={6}
                      className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono"
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      Jinja2 template to transform messages. Available
                      variables: message, value, timestamp
                    </div>
                  </div>

                  {/* Example Templates */}
                  <div className="bg-slate-800/50 rounded-lg p-4 border border-gray-600/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Code className="w-4 h-4 text-indigo-400" />
                      <div className="text-sm font-medium text-gray-300">
                        Template Examples
                      </div>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="text-gray-400">
                        <span className="text-indigo-400">Extract field:</span>{" "}
                        <code className="bg-gray-700/50 px-1 rounded">
                          {"{{ message.data.user_id }}"}
                        </code>
                      </div>
                      <div className="text-gray-400">
                        <span className="text-indigo-400">Add metadata:</span>{" "}
                        <code className="bg-gray-700/50 px-1 rounded">
                          {
                            "{{ message | combine({'processed_at': timestamp}) | tojson }}"
                          }
                        </code>
                      </div>
                      <div className="text-gray-400">
                        <span className="text-indigo-400">Conditional:</span>{" "}
                        <code className="bg-gray-700/50 px-1 rounded">
                          {
                            "{% if message.priority == 'high' %}URGENT: {{ message.text }}{% endif %}"
                          }
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Tab */}
              {activeTab === "performance" && (
                <div className="space-y-4">
                  {/* Polling Settings */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Polling Settings
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">
                          Max Poll Records
                        </label>
                        <Field
                          type="number"
                          name="max_poll_records"
                          min="1"
                          max="10000"
                          className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">
                          Max Poll Interval (ms)
                        </label>
                        <Field
                          type="number"
                          name="max_poll_interval_ms"
                          min="30000"
                          max="600000"
                          className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fetch Settings */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Fetch Settings
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">
                          Fetch Min Bytes
                        </label>
                        <Field
                          type="number"
                          name="fetch_min_bytes"
                          min="1"
                          max="1048576"
                          className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">
                          Fetch Max Wait (ms)
                        </label>
                        <Field
                          type="number"
                          name="fetch_max_wait_ms"
                          min="100"
                          max="10000"
                          className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === "security" && (
                <div className="space-y-4">
                  {/* Security Protocol */}
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Security Protocol
                    </label>
                    <Field
                      as="select"
                      name="security_protocol"
                      className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
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
                            className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-white text-sm font-medium mb-2 block">
                            Password
                          </label>
                          <Field
                            name="password"
                            type="password"
                            className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SSL Settings */}
                  {(values.security_protocol === "SSL" ||
                    values.security_protocol === "SASL_SSL") && (
                    <div>
                      <h3 className="text-white text-sm font-medium mb-3">
                        SSL Settings
                      </h3>

                      <div className="space-y-3">
                        <div>
                          <label className="text-white text-sm font-medium mb-2 block">
                            SSL Certificate Path
                          </label>
                          <Field
                            name="ssl_cert_path"
                            placeholder="/path/to/client.crt"
                            className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-white text-sm font-medium mb-2 block">
                            SSL Key Path
                          </label>
                          <Field
                            name="ssl_key_path"
                            placeholder="/path/to/client.key"
                            className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-white text-sm font-medium mb-2 block">
                            SSL CA Path
                          </label>
                          <Field
                            name="ssl_ca_path"
                            placeholder="/path/to/ca.crt"
                            className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Test Tab */}
              {activeTab === "test" && (
                <div className="space-y-4">
                  {/* Test Configuration */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Test Message Consumption
                    </h3>

                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-gray-300">
                        Test your Kafka consumer configuration
                      </div>
                      <div className="flex gap-2">
                        {onTestConsumer && (
                          <button
                            type="button"
                            onClick={onTestConsumer}
                            disabled={
                              isTesting ||
                              isConsuming ||
                              !values.bootstrap_servers ||
                              !values.topic
                            }
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
                          >
                            <Activity className="w-3 h-3" />
                            {isTesting ? "Testing..." : "Test Consumer"}
                          </button>
                        )}
                        {onStartConsumer && onStopConsumer && (
                          <button
                            type="button"
                            onClick={
                              isConsuming ? onStopConsumer : onStartConsumer
                            }
                            disabled={
                              isTesting ||
                              !values.bootstrap_servers ||
                              !values.topic
                            }
                            className={`px-4 py-2 ${
                              isConsuming
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-green-600 hover:bg-green-700"
                            } disabled:bg-gray-600 text-white text-sm rounded-lg flex items-center gap-2 transition-colors`}
                          >
                            {isConsuming ? (
                              <Pause className="w-3 h-3" />
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                            {isConsuming ? "Stop Consumer" : "Start Consumer"}
                          </button>
                        )}
                        {generateKafkaCommand && onCopyToClipboard && (
                          <button
                            type="button"
                            onClick={() =>
                              onCopyToClipboard(
                                generateKafkaCommand(),
                                "Kafka Command"
                              )
                            }
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                            Copy Command
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Consumer Status */}
                    {isConsuming && (
                      <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          <span className="text-green-400 text-sm font-medium">
                            Consumer Active
                          </span>
                        </div>
                        <div className="text-green-300 text-sm">
                          Consuming messages from topic: {values.topic}
                        </div>
                      </div>
                    )}

                    {/* Test Results */}
                    {testResponse && (
                      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-400 text-sm font-medium">
                            Consumer Test Successful
                          </span>
                        </div>

                        {/* Response Details */}
                        <div className="space-y-2 text-sm">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-blue-300">
                              <span className="text-gray-400">Topic:</span>{" "}
                              {testResponse.consumer_stats?.topic}
                            </div>
                            <div className="text-blue-300">
                              <span className="text-gray-400">Group ID:</span>{" "}
                              {testResponse.consumer_stats?.group_id}
                            </div>
                            <div className="text-blue-300">
                              <span className="text-gray-400">Messages:</span>{" "}
                              {testResponse.messages?.length || 0}
                            </div>
                            <div className="text-blue-300">
                              <span className="text-gray-400">
                                Consumer ID:
                              </span>{" "}
                              {testResponse.consumer_stats?.consumer_id}
                            </div>
                          </div>

                          {/* Timing and Stats Info */}
                          {testStats && (
                            <div className="mt-3 p-3 bg-blue-900/30 rounded border border-blue-500/20">
                              <div className="grid grid-cols-3 gap-4 text-xs">
                                <div className="text-blue-300">
                                  <Clock className="w-3 h-3 inline mr-1" />
                                  Duration:{" "}
                                  {formatDuration(testStats.duration_ms)}
                                </div>
                                <div className="text-blue-300">
                                  <Hash className="w-3 h-3 inline mr-1" />
                                  Messages: {testStats.messages_count}
                                </div>
                                <div className="text-blue-300">
                                  <BarChart3 className="w-3 h-3 inline mr-1" />
                                  Timestamp:{" "}
                                  {new Date(
                                    testStats.timestamp
                                  ).toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Messages Preview */}
                          {testResponse.messages &&
                            testResponse.messages.length > 0 && (
                              <div>
                                <details className="text-blue-300">
                                  <summary className="cursor-pointer hover:text-blue-200">
                                    Messages Preview (
                                    {testResponse.messages.length})
                                  </summary>
                                  <div className="mt-2 p-2 bg-blue-900/30 rounded border border-blue-500/20 max-h-40 overflow-y-auto">
                                    {testResponse.messages
                                      .slice(0, 3)
                                      .map((message: any, index: number) => (
                                        <div
                                          key={index}
                                          className="mb-2 p-2 bg-blue-800/20 rounded text-xs"
                                        >
                                          <div className="text-blue-200">
                                            <span className="font-mono">
                                              Offset {message.offset}:
                                            </span>
                                            {typeof message.value === "object"
                                              ? JSON.stringify(
                                                  message.value
                                                ).substring(0, 100) + "..."
                                              : String(message.value).substring(
                                                  0,
                                                  100
                                                ) + "..."}
                                          </div>
                                        </div>
                                      ))}
                                    {testResponse.messages.length > 3 && (
                                      <div className="text-xs text-blue-400">
                                        ... and{" "}
                                        {testResponse.messages.length - 3} more
                                        messages
                                      </div>
                                    )}
                                  </div>
                                </details>
                              </div>
                            )}

                          {/* Consumer Stats */}
                          {testResponse.consumer_stats && (
                            <div>
                              <details className="text-blue-300">
                                <summary className="cursor-pointer hover:text-blue-200">
                                  Consumer Statistics
                                </summary>
                                <div className="mt-2 p-2 bg-blue-900/30 rounded border border-blue-500/20">
                                  <div className="space-y-1 text-xs">
                                    <div>
                                      Messages Received:{" "}
                                      {
                                        testResponse.consumer_stats
                                          .messages_received
                                      }
                                    </div>
                                    <div>
                                      Last Poll:{" "}
                                      {new Date(
                                        testResponse.consumer_stats.last_poll_time
                                      ).toLocaleString()}
                                    </div>
                                    {testResponse.consumer_stats.metrics && (
                                      <>
                                        <div>
                                          Success Rate:{" "}
                                          {(
                                            (1 -
                                              testResponse.consumer_stats
                                                .metrics.error_rate) *
                                            100
                                          ).toFixed(1)}
                                          %
                                        </div>
                                        <div>
                                          Avg Processing Time:{" "}
                                          {testResponse.consumer_stats.metrics.average_processing_time?.toFixed(
                                            2
                                          )}
                                          ms
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </details>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {testError && (
                      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <span className="text-red-400 text-sm font-medium">
                            Consumer Test Failed
                          </span>
                        </div>
                        <div className="text-red-300 text-sm">{testError}</div>
                      </div>
                    )}
                  </div>

                  {/* Debug Settings */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Debug Settings
                    </h3>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Field
                          type="checkbox"
                          name="logging_enabled"
                          className="w-4 h-4 text-indigo-600 bg-slate-900 border-white/20 rounded focus:ring-indigo-500"
                        />
                        <label className="text-white text-sm">
                          Enable Detailed Logging
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Field
                          type="checkbox"
                          name="debug_mode"
                          className="w-4 h-4 text-indigo-600 bg-slate-900 border-white/20 rounded focus:ring-indigo-500"
                        />
                        <label className="text-white text-sm">
                          Enable Debug Mode
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
