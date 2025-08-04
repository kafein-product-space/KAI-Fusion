// DocumentLoader types.ts

export interface DocumentLoaderData {
  // Basic properties
  id?: string;
  name?: string;
  displayName?: string;
  
  // Configuration
  file_paths?: string;
  supported_formats?: string[];
  min_content_length?: number;
  max_file_size_mb?: number;
  storage_enabled?: boolean;
  deduplicate?: boolean;
  quality_threshold?: number;
  
  // Status
  validationStatus?: "success" | "error" | "warning" | "pending";
  processing_status?: "processing" | "completed" | "error" | "idle" | "ready";
  
  // Metrics
  document_count?: number;
  total_size?: number;
  processing_time?: number;
  processing_stats?: any;
  
  // Activity
  has_error?: boolean;
  error_status?: string;
  source_type?: "web_only" | "files_only" | "mixed";
}

export interface DocumentLoaderConfigFormProps {
  initialValues: Partial<DocumentLoaderData>;
  validate: (values: any) => any;
  onSubmit: (values: any) => void;
  onCancel: () => void;
}

export interface DocumentLoaderVisualProps {
  data: DocumentLoaderData;
  isHovered: boolean;
  onDoubleClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isHandleConnected: (id: string, isSource?: boolean) => boolean;
}

export interface DocumentLoaderNodeProps {
  data: DocumentLoaderData;
  id: string;
} 