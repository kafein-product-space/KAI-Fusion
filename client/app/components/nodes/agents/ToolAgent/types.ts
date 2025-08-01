// ToolAgent types.ts

export interface ToolAgentData {
  // Basic properties
  id?: string;
  name?: string;
  displayName?: string;
  agentType?: string;
  
  // Configuration
  agent_type?: string;
  system_prompt?: string;
  max_iterations?: number;
  temperature?: number;
  enable_memory?: boolean;
  enable_tools?: boolean;
  
  // Status
  validationStatus?: "success" | "error" | "warning" | "pending";
  is_thinking?: boolean;
  is_ready?: boolean;
  is_autonomous?: boolean;
  is_conversational?: boolean;
  
  // Metrics
  tool_count?: number;
  memory_usage?: number;
  execution_time?: number;
  performance_metrics?: any;
  
  // Activity
  agent_status?: "ready" | "thinking" | "executing" | "completed" | "error" | "active";
  tool_activity?: boolean;
  selected_tools?: string[];
  response_quality?: number;
}

export interface ToolAgentConfigFormProps {
  initialValues: Partial<ToolAgentData>;
  validate: (values: any) => any;
  onSubmit: (values: any) => void;
  onCancel: () => void;
}

export interface ToolAgentVisualProps {
  data: ToolAgentData;
  isHovered: boolean;
  onDoubleClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isHandleConnected: (id: string, isSource?: boolean) => boolean;
}

export interface ToolAgentNodeProps {
  data: ToolAgentData;
  id: string;
}
