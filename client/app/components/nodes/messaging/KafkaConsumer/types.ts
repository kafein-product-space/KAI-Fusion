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
  group_id?: string;
  
  // Message processing
  message_format?: "json" | "text" | "binary";
  batch_size?: number;
  auto_offset_reset?: "earliest" | "latest";
  
  // Performance settings
  timeout_ms?: number;
  max_poll_records?: number;
  max_messages?: number;
  
  // Security settings
  security_protocol?: "PLAINTEXT" | "SSL" | "SASL_PLAINTEXT" | "SASL_SSL";
  username?: string;
  password?: string;
  
  // Advanced features
  message_filter?: string;
  transform_template?: string;
  enable_auto_commit?: boolean;
}

export interface KafkaConsumerConfig {
  bootstrap_servers: string;
  topic: string;
  group_id: string;
  message_format: "json" | "text" | "binary";
  batch_size: number;
  auto_offset_reset: "earliest" | "latest";
  timeout_ms: number;
  max_poll_records: number;
  max_messages: number;
  security_protocol: "PLAINTEXT" | "SSL" | "SASL_PLAINTEXT" | "SASL_SSL";
  username: string;
  password: string;
  message_filter: string;
  transform_template: string;
  enable_auto_commit: boolean;
}

export interface KafkaMessage {
  id: string;
  topic: string;
  key?: string;
  value: any;
  headers: Record<string, string>;
  timestamp: string;
  partition?: number;
  offset?: number;
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
    messages_sent: number;
    messages_received: number;
    errors: number;
    connections: number;
    last_activity: string | null;
  };
}

export interface KafkaConsumerResponse {
  messages: KafkaMessage[];
  message_stream: any;
  consumer_stats: KafkaConsumerStats;
  last_message: KafkaMessage | null;
  consumer_config: {
    topic: string;
    group_id: string;
    bootstrap_servers: string;
    consumer_id: string;
  };
}