// OpenAIEmbeddingsProvider types.ts

export interface OpenAIEmbeddingsProviderData {
  // Basic properties
  id?: string;
  name?: string;
  displayName?: string;
  
  // Configuration
  openai_api_key?: string;
  credential_id?: string;
  model?: string;
  organization?: string;
  dimensions?: number;
  batch_size?: number;
  max_retries?: number;
  request_timeout?: number;
  
  // Status
  validationStatus?: "success" | "error" | "warning" | "pending";
  connection_status?: "connected" | "disconnected" | "error" | "connecting";
  processing_status?: "idle" | "processing" | "completed" | "error";
  
  // Metrics
  request_count?: number;
  processing_time?: number;
  token_usage?: number;
  throughput?: number;
  
  // Activity
  has_error?: boolean;
  rate_limited?: boolean;
  batch_processing?: boolean;
  cache_enabled?: boolean;
  performance_optimized?: boolean;
  api_key_configured?: boolean;
  
  // Error
  error_message?: string;
  last_operation?: string;
}

export interface OpenAIEmbeddingsProviderConfigFormProps {
  initialValues: Partial<OpenAIEmbeddingsProviderData>;
  validate: (values: any) => any;
  onSubmit: (values: any) => void;
  onCancel: () => void;
}

export interface OpenAIEmbeddingsProviderVisualProps {
  data: OpenAIEmbeddingsProviderData;
  isHovered: boolean;
  onDoubleClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isHandleConnected: (id: string, isSource?: boolean) => boolean;
}

export interface OpenAIEmbeddingsProviderNodeProps {
  data: OpenAIEmbeddingsProviderData;
  id: string;
} 