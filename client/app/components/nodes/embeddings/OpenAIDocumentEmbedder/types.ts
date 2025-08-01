// OpenAIDocumentEmbedder types.ts

export interface OpenAIDocumentEmbedderData {
  // Basic properties
  id?: string;
  name?: string;
  displayName?: string;
  
  // Configuration
  api_key?: string;
  credential_id?: string;
  embedding_model?: string;
  organization?: string;
  embedding_dimensions?: number;
  batch_size?: number;
  max_retries?: number;
  chunk_size?: number;
  chunk_overlap?: number;
  
  // Status
  validationStatus?: "success" | "error" | "warning" | "pending";
  connection_status?: "connected" | "disconnected" | "error" | "connecting";
  embedding_status?: "idle" | "processing" | "completed" | "error";
  
  // Metrics
  vector_count?: number;
  processing_time?: number;
  token_usage?: number;
  throughput?: number;
  estimated_cost?: number;
  
  // Activity
  is_embedding?: boolean;
  embedding_type?: string;
  performance_metrics?: boolean;
  
  // Error
  error_message?: string;
  last_operation?: string;
}

export interface OpenAIDocumentEmbedderConfigFormProps {
  initialValues: Partial<OpenAIDocumentEmbedderData>;
  validate: (values: any) => any;
  onSubmit: (values: any) => void;
  onCancel: () => void;
}

export interface OpenAIDocumentEmbedderVisualProps {
  data: OpenAIDocumentEmbedderData;
  isHovered: boolean;
  onDoubleClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isHandleConnected: (id: string, isSource?: boolean) => boolean;
}

export interface OpenAIDocumentEmbedderNodeProps {
  data: OpenAIDocumentEmbedderData;
  id: string;
} 