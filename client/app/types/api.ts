// User and Authentication types
export interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at?: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
}

// Workflow types
export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    name?: string;
    [key: string]: any;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
}

export interface WorkflowData {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  flow_data: WorkflowData;
  user_id: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface WorkflowCreateRequest {
  name: string;
  description?: string;
  flow_data: WorkflowData;
}

export interface WorkflowUpdateRequest {
  name?: string;
  description?: string;
  flow_data?: WorkflowData;
  is_active?: boolean;
}

export interface WorkflowExecuteRequest {
  workflow_id?: string;
  flow_data?: WorkflowData;
  input_text: string;
  session_context?: Record<string, any>;
}

export interface WorkflowExecutionResult {
  result: any;
  execution_order?: string[];
  status?: 'completed' | 'failed' | 'running';
  node_count?: number;
  error?: string;
  error_type?: string;
  success?: boolean;
  execution_id?: string;
  executed_nodes?: string[];
  session_id?: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  input_text: string;
  result: WorkflowExecutionResult;
  started_at: string;
  completed_at?: string;
  status: 'success' | 'failed' | 'running';
  runtime?: string;
}

// Node types
export interface NodeInput {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
  default?: any;
}

export interface NodeOutput {
  name: string;
  type: string;
  description?: string;
}

export interface NodeMetadata {
  name: string;
  display_name: string;
  description: string;
  category: string;
  inputs: NodeInput[];
  outputs: NodeOutput[];
  icon?: string;
  color?: string;
}

export interface NodeCategory {
  name: string;
  display_name: string;
  icon: string;
}

export interface CustomNode {
  id: string;
  name: string;
  description: string;
  category: string;
  config: Record<string, any>;
  code: string;
  user_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomNodeCreateRequest {
  name: string;
  description: string;
  category: string;
  config: Record<string, any>;
  code: string;
  is_public?: boolean;
}

// Credentials types (for future implementation)
export interface Credential {
  id: string;
  name: string;
  type: string;
  provider: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CredentialCreateRequest {
  name: string;
  type: string;
  provider: string;
  credentials: Record<string, any>;
}

// Variables types (for future implementation)
export interface Variable {
  id: string;
  name: string;
  value: string;
  type: 'static' | 'dynamic';
  description?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface VariableCreateRequest {
  name: string;
  value: string;
  type: 'static' | 'dynamic';
  description?: string;
}

// Template types (for future implementation)
export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  flow_data: WorkflowData;
  user_id: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateCreateRequest {
  name: string;
  description: string;
  category: string;
  flow_data: WorkflowData;
  is_public?: boolean;
}

// API Response wrappers
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// Health and Info types
export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  version: string;
  components: {
    database: string;
    node_registry: string;
    session_manager: string;
  };
  warnings?: string[];
}

export interface ApiInfo {
  name: string;
  version: string;
  endpoints: Record<string, string>;
  features: Record<string, string>;
  stats: {
    registered_nodes: number;
    active_sessions: number;
  };
} 