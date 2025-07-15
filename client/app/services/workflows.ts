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
      // Transform data to match backend AdhocExecuteRequest format
      const backendPayload = {
        flow_data: data.flow_data,
        input_text: data.input_text || "Hello",
        session_id: data.session_context?.session_id
      };
      
      return await apiClient.post<WorkflowExecutionResult>(
        API_ENDPOINTS.WORKFLOWS.EXECUTE, 
        backendPayload
      );
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      throw error;
    }
  }

  /**
   * Execute a workflow with streaming response
   */
  static async executeWorkflowStream(data: WorkflowExecuteRequest): Promise<ReadableStream> {
    try {
      const streamEndpoint = API_ENDPOINTS.WORKFLOWS.EXECUTE_STREAM;

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
   * Execute a workflow with streaming response and return final result
   */
  static async executeWorkflowStreaming(data: WorkflowExecuteRequest): Promise<WorkflowExecutionResult> {
    try {
      // Transform data to match backend AdhocExecuteRequest format
      const backendPayload = {
        flow_data: data.flow_data,
        input_text: data.input_text || "Hello",
        session_id: data.session_context?.session_id
      };

      const response = await fetch(`${apiClient.getBaseURL()}${API_ENDPOINTS.WORKFLOWS.EXECUTE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiClient.getAccessToken()}`,
        },
        body: JSON.stringify(backendPayload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      // Parse streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let finalResult: WorkflowExecutionResult | null = null;
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonData = JSON.parse(line.slice(6));
                console.log('📡 Streaming chunk:', jsonData);
                
                if (jsonData.type === 'complete') {
                  console.log('🎯 Complete chunk found:', jsonData);
                  finalResult = {
                    success: true,
                    result: jsonData.result,
                    execution_id: jsonData.session_id,
                    executed_nodes: jsonData.executed_nodes,
                    session_id: jsonData.session_id
                  };
                }
              } catch (e) {
                console.warn('Failed to parse streaming chunk:', line);
              }
            } else if (line.trim()) {
              console.log('📄 Non-data line:', line);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      const result = finalResult || {
        success: false,
        result: "No result received from workflow execution",
        execution_id: backendPayload.session_id,
        executed_nodes: [],
        session_id: backendPayload.session_id
      };
      
      console.log('🏁 Final result:', result);
      return result;
    } catch (error) {
      console.error('Failed to execute workflow streaming:', error);
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