export interface KafkaProducerNodeProps {
  data: KafkaProducerData;
  id: string;
}

export interface KafkaProducerData {
  name?: string;
  displayName?: string;
  description?: string;
  validationStatus?: "success" | "error" | "pending";

  // Connection settings
  bootstrap_servers?: string;
  topic?: string;

  // Message settings
  message_key?: string;
  message_format?: string;
  message_headers?: string;

  // Delivery settings
  acks?: string;
  enable_idempotence?: boolean;

  // Performance settings
  batch_size?: number;
  linger_ms?: number;
  compression?: string;

  // Security settings
  security_protocol?: string;
  username?: string;
  password?: string;

  // Advanced settings
  retries?: number;
  timeout_ms?: number;
  partitioner?: string;

  // Kafka-specific producer settings
  max_in_flight_requests_per_connection?: number;
  batch_size_bytes?: number;
  buffer_memory?: number;
  max_request_size?: number;

  // Message serialization
  key_serializer?: string;
  value_serializer?: string;
  partitioner_class?: string;

  // Advanced features
  transactional_id?: string;
  delivery_timeout_ms?: number;

  // SSL/TLS settings
  ssl_cert_path?: string;
  ssl_key_path?: string;
  ssl_ca_path?: string;

  // Monitoring
  logging_enabled?: boolean;
  debug_mode?: boolean;
}

export interface KafkaProducerConfig {
  // Connection settings
  bootstrap_servers: string;
  topic: string;

  // Message settings
  message_key: string;
  message_format: string;
  message_headers: string;

  // Delivery settings
  acks: string;
  enable_idempotence: boolean;

  // Performance settings
  batch_size: number;
  linger_ms: number;
  compression: string;

  // Security settings
  security_protocol: string;
  username: string;
  password: string;

  // Advanced settings
  retries: number;
  timeout_ms: number;
  partitioner: string;

  // Kafka-specific producer settings
  max_in_flight_requests_per_connection: number;
  batch_size_bytes: number;
  buffer_memory: number;
  max_request_size: number;

  // Message serialization
  key_serializer: string;
  value_serializer: string;
  partitioner_class: string;

  // Advanced features
  transactional_id: string;
  delivery_timeout_ms: number;

  // SSL/TLS settings
  ssl_cert_path: string;
  ssl_key_path: string;
  ssl_ca_path: string;

  // Monitoring
  logging_enabled: boolean;
  debug_mode: boolean;
}

export interface KafkaProducerResponse {
  success: boolean;
  message_id: string;
  topic: string;
  partition?: number;
  offset?: number;
  timestamp: string;
  error?: string;
  metadata?: {
    serialized_key_size: number;
    serialized_value_size: number;
    headers_count: number;
    send_duration_ms: number;
    timestamp_type?: number;
    checksum?: string;
  };
}

export interface KafkaProducerStats {
  total_messages: number;
  successful_messages: number;
  failed_messages: number;
  average_send_time: number;
  last_message_at: string | null;
  error_rate: number;
  throughput_per_second: number;
  bytes_sent: number;
  compression_ratio?: number;
}

export interface KafkaTestResult {
  success: boolean;
  response?: KafkaProducerResponse;
  error?: string;
  stats?: {
    duration_ms: number;
    message_size: number;
    timestamp: string;
  };
}
