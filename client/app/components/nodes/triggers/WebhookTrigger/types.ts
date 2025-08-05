export interface WebhookTriggerNodeProps {
  data: WebhookTriggerData;
  id: string;
}

export interface WebhookTriggerData {
  webhook_id?: string;
  webhook_token?: string;
  authentication_required?: boolean;
  allowed_event_types?: string;
  max_payload_size?: number;
  rate_limit_per_minute?: number;
  enable_cors?: boolean;
  webhook_timeout?: number;
  validationStatus?: "success" | "error" | "warning" | "pending";
  displayName?: string;
  name?: string;
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
  authentication_required: boolean;
  allowed_event_types: string;
  max_payload_size: number;
  rate_limit_per_minute: number;
  enable_cors: boolean;
  webhook_timeout: number;
} 