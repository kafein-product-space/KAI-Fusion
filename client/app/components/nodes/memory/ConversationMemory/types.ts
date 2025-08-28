// ConversationMemory types.ts

export interface ConversationMemoryData {
  // Basic properties
  id?: string;
  name?: string;
  displayName?: string;
  
  // Core configuration
  k: number;
  memory_key: string;
  return_messages: boolean;
  input_key: string;
  output_key: string;
  
  // Feature flags
  enable_cleanup: boolean;
  cleanup_threshold: number;
  enable_compression: boolean;
  compression_ratio: number;
  enable_encryption: boolean;
  encryption_key: string;
  enable_backup: boolean;
  backup_interval: number;
  
  // Status
  validationStatus?: "success" | "error" | "warning" | "pending";
  memory_type?: "conversation" | "buffer" | "summary";
  memory_status?: "active" | "full" | "empty" | "ready";
  
  // Activity indicators
  is_active?: boolean;
  current_usage?: number;
  performance_metrics?: any;
  conversation_count?: number;
  history_length?: number;
  memory_performance?: boolean;
  auto_cleanup?: boolean;
  history_retention?: boolean;
}

export interface ConversationMemoryConfigFormProps {
  configData?: any;
  onSave?: (values: any) => void;
  onCancel: () => void;
  initialValues?: any;
  validate?: (values: any) => any;
  onSubmit?: (values: any) => void;
}

export interface ConversationMemoryVisualProps {
  data: ConversationMemoryData;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isHandleConnected: (id: string, isSource?: boolean) => boolean;
}

export interface ConversationMemoryNodeProps {
  data: ConversationMemoryData;
  id: string;
}