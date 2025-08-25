import { apiClient } from '~/lib/api-client';
import type { 
  ExternalWorkflowConfig,
  ExternalWorkflowInfo,
  ExternalWorkflowRegistration,
  ExternalWorkflowStatus
} from '~/types/external-workflows';

/**
 * Service for managing external Docker workflows
 */
export const externalWorkflowService = {
  /**
   * Register an external Docker workflow
   */
  async registerExternalWorkflow(config: ExternalWorkflowConfig): Promise<ExternalWorkflowRegistration> {
    return await apiClient.post<ExternalWorkflowRegistration>(
      '/external/register',
      config
    );
  },

  /**
   * List all registered external workflows
   */
  async listExternalWorkflows(): Promise<ExternalWorkflowInfo[]> {
    return await apiClient.get<ExternalWorkflowInfo[]>('/external');
  },

  /**
   * Check status of an external workflow
   */
  async checkExternalWorkflowStatus(workflowId: string): Promise<ExternalWorkflowStatus> {
    return await apiClient.get<ExternalWorkflowStatus>(
      `/external/${workflowId}/status`
    );
  },

  /**
   * Get external workflow info (read-only)
   */
  async getExternalWorkflowInfo(workflowId: string): Promise<any> {
    return await apiClient.get<any>(`/external/${workflowId}/info`);
  },

  /**
   * Chat with external workflow (read-only)
   */
  async chatWithExternalWorkflow(workflowId: string, input: string, sessionId?: string): Promise<any> {
    return await apiClient.post<any>(
      `/external/${workflowId}/chat`,
      { input, session_id: sessionId }
    );
  },

  /**
   * List all chat sessions for an external workflow
   */
  async listExternalWorkflowSessions(workflowId: string): Promise<any> {
    return await apiClient.get<any>(`/external/${workflowId}/sessions`);
  },

  /**
   * Get chat history for a specific session
   */
  async getExternalWorkflowSessionHistory(workflowId: string, sessionId: string): Promise<any> {
    return await apiClient.get<any>(`/external/${workflowId}/sessions/${sessionId}/history`);
  },

  /**
   * Clear a specific chat session
   */
  async clearExternalWorkflowSession(workflowId: string, sessionId: string): Promise<any> {
    return await apiClient.delete<any>(`/external/${workflowId}/sessions/${sessionId}`);
  },

  /**
   * Execute an external workflow
   */
  async executeExternalWorkflow(workflowId: string, executionData: any): Promise<any> {
    return await apiClient.post(
      `/external/${workflowId}/execute`,
      executionData
    );
  },

  /**
   * Unregister an external workflow
   */
  async unregisterExternalWorkflow(workflowId: string): Promise<{ message: string; workflow_id: string }> {
    return await apiClient.delete(
      `/external/${workflowId}`
    );
  }
};

export default externalWorkflowService;
