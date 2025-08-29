// KafkaProducer Types and Interfaces

export interface KafkaProducerData {
  id: string;
  type: "KafkaProducer";
  config: KafkaProducerConfig;
  position: {
    x: number;
    y: number;
  };
}

export interface KafkaProducerConfig {
  // Connection settings
  bootstrap_servers: string;
  topic: string;
  client_id?: string;

  // Message settings
  message_format: "json" | "text" | "binary";
  message_key_template?: string;
  message_value_template?: string;
  headers?: Record<string, string>;

  // Producer settings
  acks: "0" | "1" | "all";
  retries: number;
  batch_size: number;
  linger_ms: number;
  buffer_memory: number;
  compression_type: "none" | "gzip" | "snappy" | "lz4" | "zstd";
  max_request_size: number;
  request_timeout_ms: number;
  delivery_timeout_ms: number;
  enable_idempotence: boolean;

  // Security settings
  security_protocol: "PLAINTEXT" | "SSL" | "SASL_PLAINTEXT" | "SASL_SSL";
  sasl_mechanism?: "PLAIN" | "SCRAM-SHA-256" | "SCRAM-SHA-512";
  username?: string;
  password?: string;
  ssl_cafile?: string;
  ssl_certfile?: string;
  ssl_keyfile?: string;

  // Advanced settings
  partitioner?: "default" | "round_robin" | "murmur2";
  max_in_flight_requests_per_connection: number;
  metadata_max_age_ms: number;
  retry_backoff_ms: number;
}

export interface KafkaMessage {
  key?: string | null;
  value: any;
  headers?: Record<string, string>;
  partition?: number;
  timestamp?: string;
}

export interface KafkaProducerStats {
  messages_sent: number;
  messages_pending: number;
  messages_failed: number;
  bytes_sent: number;
  partitions: number[];
  client_id: string;
  topic: string;
  metrics: {
    batch_size_avg: number;
    batch_size_max: number;
    record_send_rate: number;
    record_error_rate: number;
    request_latency_avg: number;
    request_latency_max: number;
    outgoing_byte_rate: number;
    last_activity?: string;
    connection_count: number;
  };
}

export interface KafkaProducerTestResult {
  success: boolean;
  message?: KafkaMessage;
  partition?: number;
  offset?: number;
  error?: string;
  latency_ms?: number;
}

// Default configuration for new KafkaProducer nodes
export const DEFAULT_KAFKA_PRODUCER_CONFIG: KafkaProducerConfig = {
  bootstrap_servers: "localhost:9092",
  topic: "",
  client_id: "kai-fusion-producer",
  message_format: "json",
  message_key_template: "",
  message_value_template: "{{ data }}",
  headers: {},
  acks: "1",
  retries: 3,
  batch_size: 16384,
  linger_ms: 0,
  buffer_memory: 33554432, // 32MB
  compression_type: "none",
  max_request_size: 1048576, // 1MB
  request_timeout_ms: 30000,
  delivery_timeout_ms: 120000,
  enable_idempotence: false,
  security_protocol: "PLAINTEXT",
  partitioner: "default",
  max_in_flight_requests_per_connection: 5,
  metadata_max_age_ms: 300000, // 5 minutes
  retry_backoff_ms: 100,
};

// Message templates for different use cases
export const MESSAGE_TEMPLATES = {
  simple: {
    name: "Simple Message",
    key_template: "",
    value_template: "{{ data }}",
    description: "Send data as-is"
  },
  event: {
    name: "Event Message",
    key_template: "{{ event_id }}",
    value_template: '{"event_type": "{{ event_type }}", "data": {{ data | tojson }}, "timestamp": "{{ timestamp }}"}',
    description: "Structured event with metadata"
  },
  user_action: {
    name: "User Action",
    key_template: "{{ user_id }}",
    value_template: '{"user_id": "{{ user_id }}", "action": "{{ action }}", "data": {{ data | tojson }}, "timestamp": "{{ timestamp }}"}',
    description: "User action tracking"
  },
  notification: {
    name: "Notification",
    key_template: "{{ recipient_id }}",
    value_template: '{"recipient": "{{ recipient_id }}", "message": "{{ message }}", "type": "{{ notification_type }}", "timestamp": "{{ timestamp }}"}',
    description: "User notifications"
  },
};

// Producer performance presets
export const PERFORMANCE_PRESETS = {
  throughput: {
    name: "High Throughput",
    description: "Optimized for maximum throughput",
    config: {
      acks: "1" as const,
      batch_size: 65536,
      linger_ms: 10,
      compression_type: "lz4" as const,
      enable_idempotence: false,
      max_in_flight_requests_per_connection: 5,
    }
  },
  latency: {
    name: "Low Latency",
    description: "Optimized for minimum latency",
    config: {
      acks: "1" as const,
      batch_size: 1,
      linger_ms: 0,
      compression_type: "none" as const,
      enable_idempotence: false,
      max_in_flight_requests_per_connection: 1,
    }
  },
  durability: {
    name: "High Durability",
    description: "Optimized for data durability and consistency",
    config: {
      acks: "all" as const,
      retries: 10,
      enable_idempotence: true,
      max_in_flight_requests_per_connection: 1,
      delivery_timeout_ms: 300000,
    }
  },
  balanced: {
    name: "Balanced",
    description: "Balanced performance and reliability",
    config: {
      acks: "1" as const,
      batch_size: 16384,
      linger_ms: 5,
      compression_type: "snappy" as const,
      enable_idempotence: false,
      max_in_flight_requests_per_connection: 3,
    }
  },
};

export type PerformancePreset = keyof typeof PERFORMANCE_PRESETS;