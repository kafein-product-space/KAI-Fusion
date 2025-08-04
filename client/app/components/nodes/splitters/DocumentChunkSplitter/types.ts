// DocumentChunkSplitter types.ts

export interface DocumentChunkSplitterData {
  // Basic properties
  id?: string;
  name?: string;
  displayName?: string;
  
  // Configuration
  chunkSize?: number;
  overlap?: number;
  separator?: string;
  keepSeparator?: boolean;
  lengthFunction?: string;
  isSeparatorRegex?: boolean;
  
  // Status
  validationStatus?: "success" | "error" | "warning" | "pending";
  processing?: boolean;
  splitStatus?: "idle" | "processing" | "completed" | "error";
  
  // Metrics
  chunkCount?: number;
  totalCharacters?: number;
  averageChunkSize?: number;
  processingTime?: number;
  
  // Activity
  is_splitting?: boolean;
  split_type?: string;
  performance_metrics?: boolean;
  
  // Error
  error_message?: string;
  last_operation?: string;
}

export interface DocumentChunkSplitterConfigFormProps {
  initialValues: Partial<DocumentChunkSplitterData>;
  validate: (values: any) => any;
  onSubmit: (values: any) => void;
  onCancel: () => void;
}

export interface DocumentChunkSplitterVisualProps {
  data: DocumentChunkSplitterData;
  isHovered: boolean;
  onDoubleClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isHandleConnected: (id: string, isSource?: boolean) => boolean;
}

export interface DocumentChunkSplitterNodeProps {
  data: DocumentChunkSplitterData;
  id: string;
} 