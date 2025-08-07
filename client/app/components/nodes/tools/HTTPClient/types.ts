export interface HTTPClientNodeProps {
  data: HTTPClientData;
  id: string;
}

export interface HTTPClientData {
  name?: string;
  displayName?: string;
  description?: string;
  validationStatus?: "success" | "error" | "pending";
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
  retry_count?: number;
  retry_delay?: number;
  follow_redirects?: boolean;
  verify_ssl?: boolean;
  proxy_url?: string;
  auth_username?: string;
  auth_password?: string;
  api_key_header?: string;
  api_key_value?: string;
  content_type?: string;
  response_format?: string;
  success_status_codes?: string;
  error_handling?: string;
  rate_limit_enabled?: boolean;
  rate_limit_requests?: number;
  rate_limit_window?: number;
  connection_timeout?: number;
  read_timeout?: number;
  max_redirects?: number;
  retry_exponential_backoff?: boolean;
  retry_on_status_codes?: string;
  ssl_cert_path?: string;
  ssl_key_path?: string;
  ssl_ca_path?: string;
  compression_enabled?: boolean;
  response_filter?: string;
  connection_pooling?: boolean;
  max_connections?: number;
  keep_alive?: boolean;
  custom_headers?: string;
  query_params?: string;
  form_data?: string;
  multipart_enabled?: boolean;
  file_upload_path?: string;
  file_upload_field?: string;
  response_validation?: string;
  timeout_handling?: string;
  circuit_breaker_enabled?: boolean;
  circuit_breaker_threshold?: number;
  circuit_breaker_timeout?: number;
  logging_enabled?: boolean;
  debug_mode?: boolean;
}

export interface HTTPClientConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timeout: number;
  retry_count: number;
  retry_delay: number;
  follow_redirects: boolean;
  verify_ssl: boolean;
  proxy_url: string;
  auth_username: string;
  auth_password: string;
  api_key_header: string;
  api_key_value: string;
  content_type: string;
  response_format: string;
  success_status_codes: string;
  error_handling: string;
  rate_limit_enabled: boolean;
  rate_limit_requests: number;
  rate_limit_window: number;
  connection_timeout: number;
  read_timeout: number;
  max_redirects: number;
  retry_exponential_backoff: boolean;
  retry_on_status_codes: string;
  ssl_cert_path: string;
  ssl_key_path: string;
  ssl_ca_path: string;
  compression_enabled: boolean;
  response_filter: string;
  connection_pooling: boolean;
  max_connections: number;
  keep_alive: boolean;
  custom_headers: string;
  query_params: string;
  form_data: string;
  multipart_enabled: boolean;
  file_upload_path: string;
  file_upload_field: string;
  response_validation: string;
  timeout_handling: string;
  circuit_breaker_enabled: boolean;
  circuit_breaker_threshold: number;
  circuit_breaker_timeout: number;
  logging_enabled: boolean;
  debug_mode: boolean;
}

export interface HTTPResponse {
  status_code: number;
  content: any;
  headers: Record<string, string>;
  success: boolean;
  request_stats?: {
    duration_ms: number;
    response_size: number;
    timestamp: string;
  };
}

export interface HTTPStats {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  average_response_time: number;
  last_request_at: string | null;
  error_rate: number;
} 