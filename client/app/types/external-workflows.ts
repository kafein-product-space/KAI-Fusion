/**
 * Types for external workflow management
 */

export interface ExternalWorkflowConfig {
  name: string;
  description: string;
  host: string;
  port: number;
  api_key?: string;
  is_secure: boolean;
}

export interface ExternalWorkflowInfo {
  workflow_id: string;
  name: string;
  description: string;
  external_url: string;
  api_key_required: boolean;
  connection_status: string;
  created_at?: string;
  last_health_check?: string;
  capabilities: {
    chat?: boolean;
    memory?: boolean;
    info_access?: boolean;
    modification?: boolean;
    execution?: boolean;
    monitoring?: boolean;
    api_key_required?: boolean;
  };
}

export interface ExternalWorkflowRegistration {
  id: string;
  external_workflow_id: string;
  name: string;
  description: string;
  external_url: string;
  connection_status: string;
  registered_at: string;
}

export interface ExternalWorkflowStatus {
  status: 'online' | 'offline' | 'error';
  last_ping?: string;
  external_url: string;
  workflow_id: string;
  error?: string;
}
