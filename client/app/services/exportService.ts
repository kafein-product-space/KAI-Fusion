import { apiClient } from '~/lib/api-client';
import { API_ENDPOINTS } from '~/lib/config';
import type { 
  WorkflowExportInitResponse,
  WorkflowExportCompleteRequest,
  WorkflowExportCompleteResponse,
  WorkflowExportConfig
} from '~/types/export';

/**
 * Service for handling workflow Docker export operations
 */
export const exportService = {
  /**
   * Initialize workflow export and get required environment variables
   */
  async initializeExport(workflowId: string, config: WorkflowExportConfig = {}): Promise<WorkflowExportInitResponse> {
    return await apiClient.post<WorkflowExportInitResponse>(
      API_ENDPOINTS.EXPORT.WORKFLOW_INIT(workflowId),
      {
        include_credentials: config.include_credentials || false,
        export_format: config.export_format || "docker"
      }
    );
  },

  /**
   * Complete workflow export with user-provided environment variables
   */
  async completeExport(
    workflowId: string, 
    config: WorkflowExportCompleteRequest
  ): Promise<WorkflowExportCompleteResponse> {
    return await apiClient.post<WorkflowExportCompleteResponse>(
      API_ENDPOINTS.EXPORT.WORKFLOW_COMPLETE(workflowId),
      config
    );
  },

  /**
   * Download the exported workflow package
   */
  async downloadPackage(downloadUrl: string): Promise<void> {
    try {
      // Extract the endpoint path from download URL
      // downloadUrl format: "/api/v1/export/download/filename.zip"
      const endpoint = downloadUrl.startsWith('/api/v1')
        ? downloadUrl.replace('/api/v1', '')
        : downloadUrl;
        
      console.log('Downloading from endpoint:', endpoint);
      
      // Use apiClient for consistent base URL and authentication
      const response = await fetch(`${apiClient.getBaseURL()}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${apiClient.getAccessToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const filename = downloadUrl.split('/').pop() || 'workflow-export.zip';
      
      // Create download link and trigger download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up blob URL
      URL.revokeObjectURL(link.href);
      
    } catch (error) {
      console.error('Download failed:', error);
      throw new Error('Failed to download export package');
    }
  }
};

export default exportService;
