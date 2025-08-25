/**
 * Types for workflow Docker export functionality
 */

export interface WorkflowExportConfig {
  include_credentials?: boolean;
  export_format?: string;
}

export interface EnvironmentVariable {
  name: string;
  description: string;
  example?: string;
  default?: string;
  required: boolean;
  node_type: string;
}

export interface WorkflowDependency {
  nodes: string[];
  python_packages: string[];
  api_endpoints: string[];
}

export interface WorkflowExportInitResponse {
  workflow_id: string;
  workflow_name: string;
  workflow_description: string;
  required_env_vars: {
    required: EnvironmentVariable[];
    optional: EnvironmentVariable[];
  };
  dependencies: WorkflowDependency;
  export_ready: boolean;
  message: string;
}

export interface SecurityConfig {
  allowed_hosts: string;
  api_keys?: string;
  require_api_key: boolean;
  custom_api_keys?: string;
}

export interface MonitoringConfig {
  enable_langsmith: boolean;
  langsmith_api_key?: string;
  langsmith_project?: string;
}

export interface DockerConfig {
  api_port: number;
  docker_port: number;
  database_url?: string;
}

export interface WorkflowExportCompleteRequest {
  env_vars: Record<string, string>;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  docker: DockerConfig;
}

export interface WorkflowExportCompleteResponse {
  workflow_id: string;
  download_url: string;
  package_size: number;
  ready_to_run: boolean;
  export_timestamp: string;
  instructions: string;
  package_info: {
    workflow_name: string;
    included_nodes: string[];
    api_port: number;
    security_enabled: boolean;
    monitoring_enabled: boolean;
  };
}
