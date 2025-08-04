// DocumentReranker types.ts

export interface DocumentRerankerData {
  // Basic properties
  id?: string;
  name?: string;
  displayName?: string;
  
  // Configuration
  rerank_strategy?: string;
  cohere_api_key?: string;
  credential_id?: string;
  initial_k?: number;
  final_k?: number;
  hybrid_alpha?: number;
  enable_caching?: boolean;
  similarity_threshold?: number;
  
  // Status
  validationStatus?: "success" | "error" | "warning" | "pending";
  connection_status?: "connected" | "disconnected" | "error" | "connecting";
  
  // Metrics
  reranked_count?: number;
  processing_time?: number;
  accuracy_score?: number;
  throughput?: number;
  
  // Activity
  is_reranking?: boolean;
  last_operation?: string;
  error_message?: string;
}

export interface DocumentRerankerConfigFormProps {
  initialValues: Partial<DocumentRerankerData>;
  validate: (values: any) => any;
  onSubmit: (values: any) => void;
  onCancel: () => void;
}

export interface DocumentRerankerVisualProps {
  data: DocumentRerankerData;
  isHovered: boolean;
  onDoubleClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isHandleConnected: (id: string, isSource?: boolean) => boolean;
}

export interface DocumentRerankerNodeProps {
  data: DocumentRerankerData;
  id: string;
} 