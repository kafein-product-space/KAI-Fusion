/**
 * Workflow Export Service
 * 
 * Handles exporting selected workflows as a ZIP bundle.
 */

import { apiClient } from '~/lib/api-client';
import { API_ENDPOINTS } from '~/lib/config';

export interface ExportRequest {
    workflow_ids: string[];
}

/**
 * Export selected workflows as a ZIP file download.
 * 
 * @param workflowIds - Array of workflow UUIDs to export
 * @returns Promise that triggers file download
 */
export async function exportWorkflows(workflowIds: string[]): Promise<void> {
    // apiClient.post returns response.data directly (the blob)
    const data = await apiClient.post(
        API_ENDPOINTS.EXPORT.WORKFLOWS,
        { workflow_ids: workflowIds },
        {
            responseType: 'blob',
        }
    );

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '').slice(0, 14);
    const filename = `workflows_export_${timestamp}.zip`;

    // Create blob and trigger download
    const blob = new Blob([data], { type: 'application/zip' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

export default {
    exportWorkflows,
};
