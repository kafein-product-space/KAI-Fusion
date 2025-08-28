// DocumentLoader types.ts

export interface DocumentLoaderData {
  // Basic properties
  id?: string;
  name?: string;
  displayName?: string;
  
  // Google Drive Configuration
  drive_links?: string;
  google_drive_auth_type?: "service_account" | "oauth2";
  service_account_json?: string;
  oauth2_client_id?: string;
  oauth2_client_secret?: string;
  
  // Legacy file configuration (for backward compatibility)
  file_paths?: string;
  
  // Configuration
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
  source_type?: "google_drive" | "web_only" | "files_only" | "mixed";
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
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isHandleConnected: (id: string, isSource?: boolean) => boolean;
}

export interface DocumentLoaderNodeProps {
  data: DocumentLoaderData;
  id: string;
} 