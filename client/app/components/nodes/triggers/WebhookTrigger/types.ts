export interface WebhookTriggerNodeProps {
  data: WebhookTriggerData;
  id: string;
}

export interface WebhookTriggerData {
  webhook_id?: string;
  webhook_token?: string;
  http_method?: string;
  authentication_required?: boolean;
  allowed_event_types?: string;
  max_payload_size?: number;
  rate_limit_per_minute?: number;
  enable_cors?: boolean;
  webhook_timeout?: number;
  preserve_document_metadata?: boolean;
  metadata_strategy?: string;
  enable_hnsw_index?: boolean;
  validationStatus?: "success" | "error" | "warning" | "pending";
  displayName?: string;
  name?: string;
  // New fields from guide
  auth_type?: string;
  allowed_ips?: string;
  enable_websocket_broadcast?: boolean;
  realtime_channels?: string[];
  tenant_isolation?: boolean;
  tenant_header?: string;
  per_tenant_rate_limits?: Record<string, number>;
  service_discovery?: boolean;
  load_balancing?: boolean;
  circuit_breaker?: boolean;
  event_routing?: Record<string, string>;
  max_concurrent_connections?: number;
  connection_timeout?: number;
  keep_alive?: boolean;
  request_pooling?: boolean;
  enable_response_cache?: boolean;
  cache_duration?: number;
  cache_keys?: string[];
  cache_size_limit?: string;
}

export interface WebhookEvent {
  webhook_id: string;
  correlation_id: string;
  event_type: string;
  data: any;
  received_at: string;
  client_ip: string;
}

export interface WebhookStats {
  webhook_id: string;
  total_events: number;
  event_types: Record<string, number>;
  sources: Record<string, number>;
  last_event_at?: string;
}

export interface WebhookTriggerConfig {
  http_method: string;
  authentication_required: boolean;
  allowed_event_types: string;
  max_payload_size: number;
  rate_limit_per_minute: number;
  enable_cors: boolean;
  webhook_timeout: number;
  webhook_token?: string;
  auth_type?: string;
  allowed_ips?: string;
  // New fields from guide
  preserve_document_metadata?: boolean;
  metadata_strategy?: string;
  enable_hnsw_index?: boolean;
  enable_websocket_broadcast?: boolean;
  realtime_channels?: string[];
  tenant_isolation?: boolean;
  tenant_header?: string;
  per_tenant_rate_limits?: Record<string, number>;
  service_discovery?: boolean;
  load_balancing?: boolean;
  circuit_breaker?: boolean;
  event_routing?: Record<string, string>;
  max_concurrent_connections?: number;
  connection_timeout?: number;
  keep_alive?: boolean;
  request_pooling?: boolean;
  enable_response_cache?: boolean;
  cache_duration?: number;
  cache_keys?: string[];
  cache_size_limit?: string;
} 