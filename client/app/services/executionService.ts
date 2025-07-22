import { apiClient } from '../lib/api-client';
import { API_ENDPOINTS } from '../lib/config';
import type { WorkflowExecution } from '../types/api';

export const createExecution = async (workflow_id: string, inputs: Record<string, any>) => {
  return apiClient.post<WorkflowExecution>(API_ENDPOINTS.EXECUTIONS.CREATE, { workflow_id, inputs });
};

export const getExecution = async (execution_id: string) => {
  return apiClient.get<WorkflowExecution>(API_ENDPOINTS.EXECUTIONS.GET(execution_id));
};

export const listExecutions = async (workflow_id: string, params?: { skip?: number; limit?: number }) => {
  return apiClient.get<WorkflowExecution[]>(API_ENDPOINTS.EXECUTIONS.LIST, { params: { workflow_id, ...params } });
}; 