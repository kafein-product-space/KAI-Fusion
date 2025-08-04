// CohereReranker types.ts

export interface CohereRerankerData {
  // Basic properties
  id?: string;
  name?: string;
  displayName?: string;
  
  // Configuration
  cohere_api_key?: string;
  credential_id?: string;
  model?: string;
  top_n?: number;
  max_chunks_per_doc?: number;
  
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

export interface CohereRerankerConfigFormProps {
  initialValues: Partial<CohereRerankerData>;
  validate: (values: any) => any;
  onSubmit: (values: any) => void;
  onCancel: () => void;
}

export interface CohereRerankerVisualProps {
  data: CohereRerankerData;
  isHovered: boolean;
  onDoubleClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isHandleConnected: (id: string, isSource?: boolean) => boolean;
}

export interface CohereRerankerNodeProps {
  data: CohereRerankerData;
  id: string;
} 