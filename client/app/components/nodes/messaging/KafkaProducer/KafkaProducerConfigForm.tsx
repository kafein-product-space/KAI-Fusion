import React, { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import {
  Send,
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
} from "lucide-react";
import type { KafkaProducerConfig } from "./types";
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

interface KafkaProducerConfigFormProps {
  configData: KafkaProducerConfig;
  onSave: (values: Partial<KafkaProducerConfig>) => void;
  onCancel: () => void;
  isTesting?: boolean;
  testResponse?: any;
  testError?: string | null;
  testStats?: any;
  onSendTestMessage?: () => void;
  onCopyToClipboard?: (text: string, type: string) => void;
  generateKafkaCommand?: () => string;
}

export default function KafkaProducerConfigForm({
  configData,
  onSave,
  onCancel,
  isTesting = false,
  testResponse,
  testError,
  testStats,
  onSendTestMessage,
  onCopyToClipboard,
  generateKafkaCommand,
}: KafkaProducerConfigFormProps) {
  const [activeTab, setActiveTab] = useState("basic");

  const tabs = [
    {
      id: "basic",
      label: "Basic",
      icon: Settings,
      description: "Basic Kafka producer configuration",
    },
    {
      id: "message",
      label: "Message",
      icon: MessageSquare,
      description: "Message format and serialization settings",
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
      description: "Test message publishing",
    },
  ];

  const ACKNOWLEDGMENT_LEVELS = [
    {
      value: "0",
      label: "No ACK (Fire and Forget)",
      description: "Highest throughput, lowest reliability",
      icon: Zap,
    },
    {
      value: "1",
      label: "Leader ACK",
      description: "Balanced throughput and reliability",
      icon: CheckCircle,
    },
    {
      value: "all",
      label: "All Replicas ACK",
      description: "Highest reliability, lower throughput",
      icon: Shield,
    },
  ];

  const MESSAGE_FORMATS = [
    { value: "json", label: "JSON", description: "JSON formatted messages" },
    { value: "text", label: "Text", description: "Plain text messages" },
    { value: "binary", label: "Binary", description: "Binary data messages" },
    { value: "avro", label: "Avro", description: "Avro serialized messages" },
  ];

  const COMPRESSION_TYPES = [
    {
      value: "none",
      label: "No Compression",
      description: "No compression applied",
    },
    {
      value: "gzip",
      label: "GZIP",
      description: "Good compression ratio, moderate CPU",
    },
    {
      value: "snappy",
      label: "Snappy",
      description: "Fast compression, lower ratio",
    },
    { value: "lz4", label: "LZ4", description: "Very fast compression" },
    {
      value: "zstd",
      label: "ZSTD",
      description: "Best compression ratio, higher CPU",
    },
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

  const PARTITIONER_STRATEGIES = [
    {
      value: "default",
      label: "Default",
      description: "Key-based or round-robin partitioning",
    },
    {
      value: "round_robin",
      label: "Round Robin",
      description: "Even distribution across partitions",
    },
    {
      value: "murmur2",
      label: "Murmur2 Hash",
      description: "Consistent hashing for keys",
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
          if (values.retries && values.retries < 0) {
            errors.retries = "Retries must be non-negative";
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
                      className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
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
                      className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    />
                    <ErrorMessage
                      name="topic"
                      component="div"
                      className="text-red-400 text-sm mt-1"
                    />
                  </div>

                  {/* Acknowledgment Level */}
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Acknowledgment Level
                    </label>
                    <Field
                      as="select"
                      name="acks"
                      className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    >
                      {ACKNOWLEDGMENT_LEVELS.map((ack) => (
                        <option key={ack.value} value={ack.value}>
                          {ack.label} - {ack.description}
                        </option>
                      ))}
                    </Field>
                  </div>

                  {/* Idempotence */}
                  <div className="flex items-center gap-2">
                    <Field
                      type="checkbox"
                      name="enable_idempotence"
                      className="w-4 h-4 text-purple-600 bg-slate-900 border-white/20 rounded focus:ring-purple-500"
                    />
                    <label className="text-white text-sm">
                      Enable Exactly-Once Delivery (Idempotence)
                    </label>
                  </div>

                  {/* Timeout and Retries */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Timeout (ms)
                      </label>
                      <Field
                        type="number"
                        name="timeout_ms"
                        min="1000"
                        max="300000"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Retry Count
                      </label>
                      <Field
                        type="number"
                        name="retries"
                        min="0"
                        max="100"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Message Tab */}
              {activeTab === "message" && (
                <div className="space-y-4">
                  {/* Message Format */}
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Message Format
                    </label>
                    <Field
                      as="select"
                      name="message_format"
                      className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    >
                      {MESSAGE_FORMATS.map((format) => (
                        <option key={format.value} value={format.value}>
                          {format.label} - {format.description}
                        </option>
                      ))}
                    </Field>
                  </div>

                  {/* Message Key */}
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Message Key (Optional)
                    </label>
                    <Field
                      name="message_key"
                      placeholder="partition-key"
                      className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      Used for partitioning messages to specific partitions
                    </div>
                  </div>

                  {/* Message Headers */}
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Message Headers (JSON)
                    </label>
                    <Field
                      as="textarea"
                      name="message_headers"
                      placeholder='{"source": "api", "version": "1.0"}'
                      rows={3}
                      className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none font-mono"
                    />
                  </div>

                  {/* Serializers */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Key Serializer
                      </label>
                      <Field
                        as="select"
                        name="key_serializer"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      >
                        <option value="string">String</option>
                        <option value="bytes">Bytes</option>
                        <option value="json">JSON</option>
                      </Field>
                    </div>
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Value Serializer
                      </label>
                      <Field
                        as="select"
                        name="value_serializer"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      >
                        <option value="json">JSON</option>
                        <option value="string">String</option>
                        <option value="bytes">Bytes</option>
                      </Field>
                    </div>
                  </div>

                  {/* Partitioner */}
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Partitioning Strategy
                    </label>
                    <Field
                      as="select"
                      name="partitioner"
                      className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    >
                      {PARTITIONER_STRATEGIES.map((strategy) => (
                        <option key={strategy.value} value={strategy.value}>
                          {strategy.label} - {strategy.description}
                        </option>
                      ))}
                    </Field>
                  </div>
                </div>
              )}

              {/* Performance Tab */}
              {activeTab === "performance" && (
                <div className="space-y-4">
                  {/* Batching Settings */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Batching Settings
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">
                          Batch Size (messages)
                        </label>
                        <Field
                          type="number"
                          name="batch_size"
                          min="1"
                          max="10000"
                          className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
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
                          max="30000"
                          className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">
                          Batch Size (bytes)
                        </label>
                        <Field
                          type="number"
                          name="batch_size_bytes"
                          min="1"
                          max="10485760"
                          className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">
                          Buffer Memory (bytes)
                        </label>
                        <Field
                          type="number"
                          name="buffer_memory"
                          min="1048576"
                          max="1073741824"
                          className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Compression */}
                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">
                      Compression Algorithm
                    </label>
                    <Field
                      as="select"
                      name="compression"
                      className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    >
                      {COMPRESSION_TYPES.map((compression) => (
                        <option
                          key={compression.value}
                          value={compression.value}
                        >
                          {compression.label} - {compression.description}
                        </option>
                      ))}
                    </Field>
                  </div>

                  {/* Advanced Performance Settings */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Advanced Settings
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">
                          Max In-Flight Requests
                        </label>
                        <Field
                          type="number"
                          name="max_in_flight_requests_per_connection"
                          min="1"
                          max="100"
                          className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-white text-sm font-medium mb-2 block">
                          Max Request Size (bytes)
                        </label>
                        <Field
                          type="number"
                          name="max_request_size"
                          min="1024"
                          max="104857600"
                          className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="text-white text-sm font-medium mb-2 block">
                        Delivery Timeout (ms)
                      </label>
                      <Field
                        type="number"
                        name="delivery_timeout_ms"
                        min="1000"
                        max="600000"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      />
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
                      className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
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
                            className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-white text-sm font-medium mb-2 block">
                            Password
                          </label>
                          <Field
                            name="password"
                            type="password"
                            className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
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
                            className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-white text-sm font-medium mb-2 block">
                            SSL Key Path
                          </label>
                          <Field
                            name="ssl_key_path"
                            placeholder="/path/to/client.key"
                            className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-white text-sm font-medium mb-2 block">
                            SSL CA Path
                          </label>
                          <Field
                            name="ssl_ca_path"
                            placeholder="/path/to/ca.crt"
                            className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Transactional Settings */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Transactional Settings
                    </h3>

                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">
                        Transactional ID (Optional)
                      </label>
                      <Field
                        name="transactional_id"
                        placeholder="my-transactional-producer"
                        className="text-sm text-white px-4 py-3 rounded-lg w-full bg-slate-900/80 border border-gray-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      />
                      <div className="text-xs text-gray-400 mt-1">
                        Enable exactly-once semantics with transactions
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Test Tab */}
              {activeTab === "test" && (
                <div className="space-y-4">
                  {/* Test Configuration */}
                  <div>
                    <h3 className="text-white text-sm font-medium mb-3">
                      Test Message Publishing
                    </h3>

                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-gray-300">
                        Send a test message to verify your Kafka configuration
                      </div>
                      <div className="flex gap-2">
                        {onSendTestMessage && (
                          <button
                            type="button"
                            onClick={onSendTestMessage}
                            disabled={
                              isTesting ||
                              !values.bootstrap_servers ||
                              !values.topic
                            }
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            {isTesting ? "Publishing..." : "Send Test"}
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
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg flex items-center gap-2 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                            Copy Command
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Test Results */}
                    {testResponse && (
                      <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 text-sm font-medium">
                            Message Published Successfully
                          </span>
                        </div>

                        {/* Response Details */}
                        <div className="space-y-2 text-sm">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-green-300">
                              <span className="text-gray-400">Topic:</span>{" "}
                              {testResponse.topic}
                            </div>
                            <div className="text-green-300">
                              <span className="text-gray-400">Message ID:</span>{" "}
                              {testResponse.message_id}
                            </div>
                            {testResponse.partition !== undefined && (
                              <div className="text-green-300">
                                <span className="text-gray-400">
                                  Partition:
                                </span>{" "}
                                {testResponse.partition}
                              </div>
                            )}
                            {testResponse.offset !== undefined && (
                              <div className="text-green-300">
                                <span className="text-gray-400">Offset:</span>{" "}
                                {testResponse.offset}
                              </div>
                            )}
                          </div>

                          {/* Timing and Size Info */}
                          {testStats && (
                            <div className="mt-3 p-3 bg-green-900/30 rounded border border-green-500/20">
                              <div className="grid grid-cols-3 gap-4 text-xs">
                                <div className="text-green-300">
                                  <Clock className="w-3 h-3 inline mr-1" />
                                  Duration:{" "}
                                  {formatDuration(testStats.duration_ms)}
                                </div>
                                <div className="text-green-300">
                                  <Hash className="w-3 h-3 inline mr-1" />
                                  Size: {formatSize(testStats.message_size)}
                                </div>
                                <div className="text-green-300">
                                  <BarChart3 className="w-3 h-3 inline mr-1" />
                                  Timestamp:{" "}
                                  {new Date(
                                    testStats.timestamp
                                  ).toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Metadata */}
                          {testResponse.metadata && (
                            <div>
                              <details className="text-green-300">
                                <summary className="cursor-pointer hover:text-green-200">
                                  Message Metadata
                                </summary>
                                <div className="mt-2 p-2 bg-green-900/30 rounded border border-green-500/20">
                                  <div className="space-y-1 text-xs">
                                    <div>
                                      Key Size:{" "}
                                      {formatSize(
                                        testResponse.metadata
                                          .serialized_key_size
                                      )}
                                    </div>
                                    <div>
                                      Value Size:{" "}
                                      {formatSize(
                                        testResponse.metadata
                                          .serialized_value_size
                                      )}
                                    </div>
                                    <div>
                                      Headers Count:{" "}
                                      {testResponse.metadata.headers_count}
                                    </div>
                                    <div>
                                      Send Duration:{" "}
                                      {formatDuration(
                                        testResponse.metadata.send_duration_ms
                                      )}
                                    </div>
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
                            Publishing Failed
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
                          className="w-4 h-4 text-purple-600 bg-slate-900 border-white/20 rounded focus:ring-purple-500"
                        />
                        <label className="text-white text-sm">
                          Enable Detailed Logging
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Field
                          type="checkbox"
                          name="debug_mode"
                          className="w-4 h-4 text-purple-600 bg-slate-900 border-white/20 rounded focus:ring-purple-500"
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
