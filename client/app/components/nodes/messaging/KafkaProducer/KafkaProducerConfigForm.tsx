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
  Send,
  Key,
  MessageSquare,
  Server,
  Code,
  Play,
  Zap,
  Users,
} from "lucide-react";
import type { 
  KafkaProducerConfig, 
  KafkaMessage, 
  KafkaProducerStats,
  KafkaProducerTestResult,
  PerformancePreset 
} from "./types";
import { MESSAGE_TEMPLATES, PERFORMANCE_PRESETS } from "./types";
import TabNavigation from "~/components/common/TabNavigation";

// Utility functions
const formatNumber = (num: number): string => {
  if (num < 1000) return num.toString();
  if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
  return `${(num / 1000000).toFixed(1)}M`;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

interface KafkaProducerConfigFormProps {
  configData: KafkaProducerConfig;
  onSave: (values: Partial<KafkaProducerConfig>) => void;
  onCancel: () => void;
  isTesting?: boolean;
  isPublishing?: boolean;
  testResult?: KafkaProducerTestResult | null;
  stats?: KafkaProducerStats | null;
  isConnected?: boolean;
  onTestConnection?: () => void;
  onSendTestMessage?: (message: KafkaMessage) => void;
  onApplyPreset?: (preset: PerformancePreset) => void;
  onCopyToClipboard?: (text: string, type: string) => void;
  generateKafkaCliCommand?: () => string;
}

export default function KafkaProducerConfigForm({
  configData,
  onSave,
  onCancel,
  isTesting = false,
  isPublishing = false,
  testResult,
  stats,
  isConnected = false,
  onTestConnection,
  onSendTestMessage,
  onApplyPreset,
  onCopyToClipboard,
  generateKafkaCliCommand,
}: KafkaProducerConfigFormProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [testMessage, setTestMessage] = useState<KafkaMessage>({
    key: "test-key",
    value: { message: "Hello from KAI-Fusion!", timestamp: new Date().toISOString() },
    headers: { source: "kai-fusion" }
  });

  const tabs = [
    {
      id: "basic",
      label: "Basic",
      icon: Settings,
      description: "Basic Kafka configuration",
    },
    {
      id: "performance",
      label: "Performance",
      icon: Activity,
      description: "Performance optimization settings",
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
      description: "Test connection and send messages",
    },
  ];

  const MESSAGE_FORMATS = [
    { value: "json", label: "JSON", description: "JSON formatted messages" },
    { value: "text", label: "Text", description: "Plain text messages" },
    { value: "binary", label: "Binary", description: "Binary data messages" },
  ];

  const ACKS_OPTIONS = [
    { value: "0", label: "No acknowledgment", description: "Fire and forget (fastest)" },
    { value: "1", label: "Leader acknowledgment", description: "Wait for leader acknowledgment (balanced)" },
    { value: "all", label: "All replicas", description: "Wait for all replicas (safest)" },
  ];

  const COMPRESSION_TYPES = [
    { value: "none", label: "None", description: "No compression" },
    { value: "gzip", label: "GZIP", description: "GZIP compression" },
    { value: "snappy", label: "Snappy", description: "Snappy compression (balanced)" },
    { value: "lz4", label: "LZ4", description: "LZ4 compression (fast)" },
    { value: "zstd", label: "ZSTD", description: "ZSTD compression (best ratio)" },
  ];

  const SECURITY_PROTOCOLS = [
    { value: "PLAINTEXT", label: "Plain Text", description: "No encryption" },
    { value: "SSL", label: "SSL", description: "SSL encryption" },
    { value: "SASL_PLAINTEXT", label: "SASL Plain", description: "SASL authentication" },
    { value: "SASL_SSL", label: "SASL SSL", description: "SASL auth + SSL encryption" },
  ];

  const handleSendTestMessage = () => {
    if (onSendTestMessage) {
      onSendTestMessage(testMessage);
    }
  };

  const handleApplyTemplate = (template: typeof MESSAGE_TEMPLATES[keyof typeof MESSAGE_TEMPLATES], setFieldValue: any) => {
    setFieldValue("message_key_template", template.key_template);
    setFieldValue("message_value_template", template.value_template);
  };

  const handleApplyPresetInternal = (preset: PerformancePreset, setFieldValue: any) => {
    const presetConfig = PERFORMANCE_PRESETS[preset];
    if (presetConfig && onApplyPreset) {
      onApplyPreset(preset);
      // Also update form fields
      Object.entries(presetConfig.config).forEach(([key, value]) => {
        setFieldValue(key, value);
      });
    }
  };

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
          if (values.batch_size && values.batch_size < 1) {
            errors.batch_size = "Batch size must be at least 1";
          }
          if (values.retries && values.retries < 0) {
            errors.retries = "Retries cannot be negative";
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

                    {/* Client ID */}
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Client ID
                      </label>
                      <Field
                        name="client_id"
                        placeholder="kai-fusion-producer"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
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

                    {/* Message Templates */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-white text-sm font-medium">
                          Message Templates
                        </label>
                        <div className="flex gap-2">
                          {Object.entries(MESSAGE_TEMPLATES).map(([key, template]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleApplyTemplate(template, setFieldValue)}
                              className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded hover:bg-purple-600/30 transition-colors"
                              title={template.description}
                            >
                              {template.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Key Template */}
                      <div className="mb-2">
                        <label className="text-white text-xs font-medium mb-1 block">
                          Key Template (Jinja2)
                        </label>
                        <Field
                          name="message_key_template"
                          placeholder="{{ user_id }}"
                          className="text-sm text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                        />
                      </div>

                      {/* Value Template */}
                      <div>
                        <label className="text-white text-xs font-medium mb-1 block">
                          Value Template (Jinja2)
                        </label>
                        <Field
                          as="textarea"
                          name="message_value_template"
                          placeholder='{{ data }}'
                          rows={2}
                          className="text-sm text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Tab */}
              {activeTab === "performance" && (
                <div className="space-y-4">
                  {/* Performance Presets */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Performance Presets
                    </h3>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {Object.entries(PERFORMANCE_PRESETS).map(([key, preset]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleApplyPresetInternal(key as PerformancePreset, setFieldValue)}
                          className="p-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-left transition-colors"
                        >
                          <div className="text-blue-300 text-sm font-medium">{preset.name}</div>
                          <div className="text-blue-200 text-xs mt-1">{preset.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Producer Settings */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Producer Settings
                    </h3>

                    {/* Acknowledgments */}
                    <div className="mb-3">
                      <label className="text-white text-sm font-medium mb-2 block">
                        Acknowledgments (acks)
                      </label>
                      <Field
                        as="select"
                        name="acks"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        {ACKS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label} - {option.description}
                          </option>
                        ))}
                      </Field>
                    </div>

                    {/* Batch Settings */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">
                          Batch Size (bytes)
                        </label>
                        <Field
                          type="number"
                          name="batch_size"
                          min="1"
                          max="1048576"
                          className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                        <ErrorMessage
                          name="batch_size"
                          component="div"
                          className="text-red-400 text-sm mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">
                          Linger Time (ms)
                        </label>
                        <Field
                          type="number"
                          name="linger_ms"
                          min="0"
                          max="60000"
                          className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Compression */}
                    <div className="mb-3">
                      <label className="text-white text-sm font-medium mb-2 block">
                        Compression Type
                      </label>
                      <Field
                        as="select"
                        name="compression_type"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      >
                        {COMPRESSION_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label} - {type.description}
                          </option>
                        ))}
                      </Field>
                    </div>

                    {/* Advanced Settings */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Field
                          type="checkbox"
                          name="enable_idempotence"
                          className="w-4 h-4 text-blue-600 bg-slate-900 border-white/20 rounded focus:ring-blue-500"
                        />
                        <label className="text-white text-sm">
                          Enable Idempotence (exactly-once delivery)
                        </label>
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

                    {/* Test Message */}
                    <div className="mb-4">
                      <h4 className="text-white text-sm font-medium mb-3">Send Test Message</h4>
                      <div className="space-y-3">
                        {/* Message Key */}
                        <div>
                          <label className="text-white text-xs font-medium mb-1 block">
                            Message Key
                          </label>
                          <input
                            type="text"
                            value={testMessage.key || ""}
                            onChange={(e) => setTestMessage({ ...testMessage, key: e.target.value })}
                            placeholder="test-key"
                            className="text-sm text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                          />
                        </div>

                        {/* Message Value */}
                        <div>
                          <label className="text-white text-xs font-medium mb-1 block">
                            Message Value (JSON)
                          </label>
                          <textarea
                            value={JSON.stringify(testMessage.value, null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                setTestMessage({ ...testMessage, value: parsed });
                              } catch {
                                // Keep current value if invalid JSON
                              }
                            }}
                            rows={4}
                            className="text-sm text-white px-3 py-2 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none font-mono"
                          />
                        </div>

                        {/* Send Button */}
                        <button
                          type="button"
                          onClick={handleSendTestMessage}
                          disabled={isPublishing || !isConnected}
                          className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <Send className="w-3 h-3" />
                          {isPublishing ? "Sending..." : "Send Message"}
                        </button>
                      </div>
                    </div>

                    {/* Test Results */}
                    {testResult && (
                      <div className="mb-4">
                        {testResult.success ? (
                          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="w-4 h-4 text-green-400" />
                              <span className="text-green-400 text-sm font-medium">
                                Message Published Successfully
                              </span>
                            </div>
                            <div className="text-sm text-green-200 space-y-1">
                              <div>Partition: {testResult.partition}, Offset: {testResult.offset}</div>
                              {testResult.latency_ms && (
                                <div>Latency: {testResult.latency_ms}ms</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                              <span className="text-red-400 text-sm font-medium">
                                Publish Failed
                              </span>
                            </div>
                            <div className="text-sm text-red-200">{testResult.error}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Statistics */}
                    {stats && (
                      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-400 text-sm font-medium">
                            Producer Statistics
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-blue-300 mb-1">Messages Sent:</div>
                            <div className="text-blue-200 font-mono">
                              {formatNumber(stats.messages_sent)}
                            </div>
                          </div>
                          <div>
                            <div className="text-blue-300 mb-1">Data Sent:</div>
                            <div className="text-blue-200 font-mono">
                              {formatBytes(stats.bytes_sent)}
                            </div>
                          </div>
                          <div>
                            <div className="text-blue-300 mb-1">Send Rate:</div>
                            <div className="text-blue-200 font-mono">
                              {stats.metrics.record_send_rate.toFixed(1)}/s
                            </div>
                          </div>
                          <div>
                            <div className="text-blue-300 mb-1">Avg Latency:</div>
                            <div className="text-blue-200 font-mono">
                              {stats.metrics.request_latency_avg.toFixed(0)}ms
                            </div>
                          </div>
                        </div>
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