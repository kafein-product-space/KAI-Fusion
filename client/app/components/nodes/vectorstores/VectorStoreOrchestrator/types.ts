// VectorStoreOrchestrator types.ts

export interface VectorStoreOrchestratorData {
  // Basic properties
  id?: string;
  name?: string;
  displayName?: string;
  credential_id?: string;
  
  // Configuration
  connection_string?: string;
  collection_name?: string;
  table_prefix?: string; // Yeni: Table prefix
  pre_delete_collection?: boolean;
  search_algorithm?: string;
  search_k?: number;
  score_threshold?: number;
  batch_size?: number;
  enable_hnsw_index?: boolean;
  
  // Metadata Configuration - Yeni özellikler
  custom_metadata?: string; // JSON string
  preserve_document_metadata?: boolean;
  metadata_strategy?: "merge" | "replace" | "document_only";
  
  // Status
  validationStatus?: "success" | "error" | "warning" | "pending";
  connection_status?: "connected" | "disconnected" | "error" | "connecting";
  
  // Metrics
  document_count?: number;
  vector_count?: number;
  index_size?: number;
  query_performance?: number;
  
  // Activity
  is_indexing?: boolean;
  is_searching?: boolean;
  last_operation?: string;
  error_message?: string;
}

export interface VectorStoreOrchestratorConfigFormProps {
  initialValues: Partial<VectorStoreOrchestratorData>;
  validate: (values: any) => any;
  onSubmit: (values: any) => void;
  onCancel: () => void;
}

export interface VectorStoreOrchestratorVisualProps {
  data: VectorStoreOrchestratorData;
  isHovered: boolean;
  onDoubleClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isHandleConnected: (id: string, isSource?: boolean) => boolean;
}

export interface VectorStoreOrchestratorNodeProps {
  data: VectorStoreOrchestratorData;
  id: string;
} 