import { apiClient } from '~/lib/api-client';
import { API_ENDPOINTS } from '~/lib/config';
import type { 
  Workflow,
  WorkflowCreateRequest,
  WorkflowUpdateRequest,
  WorkflowExecuteRequest,
  WorkflowExecutionResult,
  WorkflowExecution,
  PaginatedResponse,
  WorkflowData
} from '~/types/api';

export class WorkflowService {
  /**
   * Get all workflows for the current user
   */
  static async getWorkflows(): Promise<Workflow[]> {
    try {
      return await apiClient.get<Workflow[]>(API_ENDPOINTS.WORKFLOWS.LIST);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      throw error;
    }
  }

  /**
   * Get a specific workflow by ID
   */
  static async getWorkflow(id: string): Promise<Workflow> {
    try {
      return await apiClient.get<Workflow>(API_ENDPOINTS.WORKFLOWS.GET(id));
    } catch (error) {
      console.error(`Failed to fetch workflow ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new workflow
   */
  static async createWorkflow(data: WorkflowCreateRequest): Promise<Workflow> {
    try {
      return await apiClient.post<Workflow>(API_ENDPOINTS.WORKFLOWS.CREATE, data);
    } catch (error) {
      console.error('Failed to create workflow:', error);
      throw error;
    }
  }

  /**
   * Update an existing workflow
   */
  static async updateWorkflow(id: string, data: WorkflowUpdateRequest): Promise<Workflow> {
    try {
      return await apiClient.put<Workflow>(API_ENDPOINTS.WORKFLOWS.UPDATE(id), data);
    } catch (error) {
      console.error(`Failed to update workflow ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a workflow
   */
  static async deleteWorkflow(id: string): Promise<void> {
    try {
      await apiClient.delete(API_ENDPOINTS.WORKFLOWS.DELETE(id));
    } catch (error) {
      console.error(`Failed to delete workflow ${id}:`, error);
      throw error;
    }
  }

  /**
   * Execute a workflow
   */
  static async executeWorkflow(data: WorkflowExecuteRequest): Promise<WorkflowExecutionResult> {
    try {
      return await apiClient.post<WorkflowExecutionResult>(
        API_ENDPOINTS.WORKFLOWS.EXECUTE, 
        data
      );
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      throw error;
    }
  }

  /**
   * Execute a workflow with streaming response
   */
  static async executeWorkflowStream(workflowId: string, data: WorkflowExecuteRequest): Promise<ReadableStream> {
    try {
      const streamEndpoint = API_ENDPOINTS.WORKFLOWS.EXECUTE_STREAM(workflowId);

      const response = await fetch(`${apiClient.getBaseURL()}${streamEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiClient.getAccessToken()}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      return response.body;
    } catch (error) {
      console.error('Failed to execute workflow stream:', error);
      throw error;
    }
  }

  /**
   * Validate workflow data
   */
  static async validateWorkflow(flowData: WorkflowData): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      return await apiClient.post<{ valid: boolean; errors?: string[] }>(
        API_ENDPOINTS.WORKFLOWS.VALIDATE,
        { flow_data: flowData }
      );
    } catch (error) {
      console.error('Failed to validate workflow:', error);
      throw error;
    }
  }

  /**
   * Get executions for a specific workflow
   */
  static async getWorkflowExecutions(workflowId: string): Promise<WorkflowExecution[]> {
    try {
      return await apiClient.get<WorkflowExecution[]>(
        API_ENDPOINTS.WORKFLOWS.EXECUTIONS(workflowId)
      );
    } catch (error) {
      console.error(`Failed to fetch executions for workflow ${workflowId}:`, error);
      throw error;
    }
  }
}

export default WorkflowService; 