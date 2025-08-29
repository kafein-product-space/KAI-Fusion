export interface KafkaConsumerNodeProps {
  data: KafkaConsumerData;
  id: string;
}

export interface KafkaConsumerData {
  name?: string;
  displayName?: string;
  description?: string;
  validationStatus?: "success" | "error" | "pending";

  // Connection settings
  bootstrap_servers?: string;
  topic?: string;

  // Consumer group settings
  group_id?: string;
  auto_offset_reset?: string;

  // Message processing
  message_format?: string;
  batch_size?: number;

  // Performance settings
  timeout_ms?: number;
  max_poll_records?: number;

  // Security settings
  security_protocol?: string;
  username?: string;
  password?: string;

  // Advanced features
  message_filter?: string;
  transform_template?: string;
  enable_auto_commit?: boolean;
  max_messages?: number;

  // Kafka-specific consumer settings
  auto_commit_interval_ms?: number;
  session_timeout_ms?: number;
  heartbeat_interval_ms?: number;
  max_poll_interval_ms?: number;
  fetch_min_bytes?: number;
  fetch_max_wait_ms?: number;

  // SSL/TLS settings
  ssl_cert_path?: string;
  ssl_key_path?: string;
  ssl_ca_path?: string;

  // Monitoring
  logging_enabled?: boolean;
  debug_mode?: boolean;
}

export interface KafkaConsumerConfig {
  // Connection settings
  bootstrap_servers: string;
  topic: string;

  // Consumer group settings
  group_id: string;
  auto_offset_reset: string;

  // Message processing
  message_format: string;
  batch_size: number;

  // Performance settings
  timeout_ms: number;
  max_poll_records: number;

  // Security settings
  security_protocol: string;
  username: string;
  password: string;

  // Advanced features
  message_filter: string;
  transform_template: string;
  enable_auto_commit: boolean;
  max_messages: number;

  // Kafka-specific consumer settings
  auto_commit_interval_ms: number;
  session_timeout_ms: number;
  heartbeat_interval_ms: number;
  max_poll_interval_ms: number;
  fetch_min_bytes: number;
  fetch_max_wait_ms: number;

  // SSL/TLS settings
  ssl_cert_path: string;
  ssl_key_path: string;
  ssl_ca_path: string;

  // Monitoring
  logging_enabled: boolean;
  debug_mode: boolean;
}

export interface KafkaMessage {
  topic: string;
  key?: string;
  value: any;
  headers: Record<string, string>;
  timestamp: string;
  partition: number;
  offset: number;
}

export interface KafkaConsumerResponse {
  success: boolean;
  messages: KafkaMessage[];
  consumer_stats: KafkaConsumerStats;
  last_message?: KafkaMessage;
  error?: string;
}

export interface KafkaConsumerStats {
  consumer_id: string;
  topic: string;
  group_id: string;
  messages_received: number;
  last_poll_time: string;
  configuration: {
    bootstrap_servers: string;
    auto_offset_reset: string;
    batch_size: number;
    security_protocol: string;
  };
  metrics: {
    total_messages: number;
    successful_messages: number;
    failed_messages: number;
    average_processing_time: number;
    last_message_at: string | null;
    error_rate: number;
  };
  partition_assignments?: Array<{
    topic: string;
    partition: number;
    current_offset: number;
    high_water_mark: number;
    lag: number;
  }>;
}

export interface KafkaTestResult {
  success: boolean;
  response?: KafkaConsumerResponse;
  error?: string;
  stats?: {
    duration_ms: number;
    messages_count: number;
    timestamp: string;
  };
}

export interface ConsumerGroupInfo {
  group_id: string;
  state: string;
  protocol_type: string;
  protocol: string;
  members: Array<{
    member_id: string;
    client_id: string;
    client_host: string;
    assignments: Array<{
      topic: string;
      partitions: number[];
    }>;
  }>;
}
