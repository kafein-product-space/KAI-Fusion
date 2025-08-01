// TavilyWebSearch types.ts

export interface TavilyWebSearchData {
  // Basic properties
  id?: string;
  name?: string;
  displayName?: string;
  
  // Configuration
  tavily_api_key?: string;
  credential_id?: string;
  search_type?: string;
  max_results?: number;
  search_depth?: string;
  include_domains?: string[];
  exclude_domains?: string[];
  include_answer?: boolean;
  include_raw_content?: boolean;
  include_images?: boolean;
  
  // Status
  validationStatus?: "success" | "error" | "warning" | "pending";
  connection_status?: "connected" | "disconnected" | "error" | "connecting";
  
  // Metrics
  search_count?: number;
  processing_time?: number;
  results_count?: number;
  throughput?: number;
  
  // Activity
  is_searching?: boolean;
  last_operation?: string;
  error_message?: string;
}

export interface TavilyWebSearchConfigFormProps {
  initialValues: Partial<TavilyWebSearchData>;
  validate: (values: any) => any;
  onSubmit: (values: any) => void;
  onCancel: () => void;
}

export interface TavilyWebSearchVisualProps {
  data: TavilyWebSearchData;
  isHovered: boolean;
  onDoubleClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isHandleConnected: (id: string, isSource?: boolean) => boolean;
}

export interface TavilyWebSearchNodeProps {
  data: TavilyWebSearchData;
  id: string;
} 