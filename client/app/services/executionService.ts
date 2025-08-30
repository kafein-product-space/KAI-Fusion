import { apiClient } from '../lib/api-client';
import { API_ENDPOINTS } from '../lib/config';
import type { WorkflowExecution } from '../types/api';

export const createExecution = async (workflow_id: string, inputs: Record<string, any>) => {
  return apiClient.post<WorkflowExecution>(API_ENDPOINTS.EXECUTIONS.CREATE, { workflow_id, inputs });
};

export const getExecution = async (execution_id: string) => {
  return apiClient.get<WorkflowExecution>(API_ENDPOINTS.EXECUTIONS.GET(execution_id));
};

export const listExecutions = async (workflow_id?: string, params?: { skip?: number; limit?: number }) => {
  const requestParams = workflow_id ? { workflow_id, ...params } : params;
  return apiClient.get<WorkflowExecution[]>(API_ENDPOINTS.EXECUTIONS.LIST, { params: requestParams });
};

// New function for workflow execution
export const executeWorkflow = async (workflow_id: string, executionData: {
  flow_data: any;
  input_text: string;
  node_id?: string;
  execution_type?: string;
  trigger_source?: string;
}) => {
  return apiClient.post<WorkflowExecution>(API_ENDPOINTS.WORKFLOWS.EXECUTE, {
    workflow_id,
    ...executionData
  });
};

export const deleteExecution = async (execution_id: string) => {
  return apiClient.delete(`/executions/${execution_id}`);
}; 

// Streaming execution (SSE via fetch). Returns ReadableStream of events.
export const executeWorkflowStream = async (executionData: {
  flow_data: any;
  input_text: string;
  chatflow_id?: string;
  session_id?: string;
  node_id?: string;
  execution_type?: string;
  trigger_source?: string;
  workflow_id?: string;
}): Promise<ReadableStream> => {
  const base = apiClient.getBaseURL();
  const url = `${base}${API_ENDPOINTS.WORKFLOWS.EXECUTE}`;
  const token = apiClient.getAccessToken();

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(executionData),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to start streaming execution: ${res.status} ${text}`);
  }

  return res.body as ReadableStream;
};