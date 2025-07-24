import { apiClient } from '~/lib/api-client';
import type {
  Workflow,
  WorkflowCreateRequest,
  WorkflowUpdateRequest,
  WorkflowStats,
  WorkflowTemplate,
  WorkflowTemplateCreate,
  WorkflowTemplateResponse,
  WorkflowValidationResult,
  WorkflowPublicSearchParams,
  WorkflowSearchParams,
  WorkflowDuplicateRequest,
  WorkflowVisibilityUpdate,
  WorkflowData
} from '~/types/api';
import { API_ENDPOINTS } from '~/lib/config';

export default {
  // Get all workflows for the current user
  async getWorkflows(params?: { skip?: number; limit?: number }) {
    return await apiClient.get<Workflow[]>(API_ENDPOINTS.WORKFLOWS.LIST, { params });
  },
  // Get a specific workflow by ID
  async getWorkflow(id: string) {
    return await apiClient.get<Workflow>(API_ENDPOINTS.WORKFLOWS.GET(id));
  },
  // Create a new workflow
  async createWorkflow(data: WorkflowCreateRequest) {
    return await apiClient.post<Workflow>(API_ENDPOINTS.WORKFLOWS.CREATE, data);
  },
  // Update an existing workflow
  async updateWorkflow(id: string, data: WorkflowUpdateRequest) {
    return await apiClient.put<Workflow>(API_ENDPOINTS.WORKFLOWS.UPDATE(id), data);
  },
  // Delete a workflow
  async deleteWorkflow(id: string) {
    return await apiClient.delete(API_ENDPOINTS.WORKFLOWS.DELETE(id));
  },
  // Validate workflow structure
  async validateWorkflow(flowData: WorkflowData) {
    return await apiClient.post<WorkflowValidationResult>(API_ENDPOINTS.WORKFLOWS.VALIDATE, { flow_data: flowData });
  },
  // Get public workflows
  async getPublicWorkflows(params?: WorkflowPublicSearchParams) {
    return await apiClient.get<Workflow[]>(API_ENDPOINTS.WORKFLOWS.PUBLIC, { params });
  },
  // Search user's workflows
  async searchWorkflows(params: WorkflowSearchParams) {
    return await apiClient.get<Workflow[]>(API_ENDPOINTS.WORKFLOWS.SEARCH, { params });
  },
  // Duplicate a workflow
  async duplicateWorkflow(id: string, new_name?: string) {
    return await apiClient.post<Workflow>(API_ENDPOINTS.WORKFLOWS.DUPLICATE(id), { new_name });
  },
  // Update workflow visibility
  async updateWorkflowVisibility(id: string, is_public: boolean) {
    return await apiClient.patch(API_ENDPOINTS.WORKFLOWS.VISIBILITY(id), { is_public });
  },
  // Get workflow stats
  async getWorkflowStats() {
    return await apiClient.get<WorkflowStats>(API_ENDPOINTS.WORKFLOWS.STATS);
  },
  // Get workflow templates
  async getWorkflowTemplates(params?: { skip?: number; limit?: number; category?: string; search?: string }) {
    return await apiClient.get<WorkflowTemplateResponse[]>(API_ENDPOINTS.WORKFLOWS.TEMPLATES, { params });
  },
  // Get template categories
  async getTemplateCategories() {
    return await apiClient.get<{ categories: string[] }>(API_ENDPOINTS.WORKFLOWS.TEMPLATE_CATEGORIES);
  },
  // Create a new workflow template
  async createWorkflowTemplate(data: WorkflowTemplateCreate) {
    return await apiClient.post<WorkflowTemplateResponse>(API_ENDPOINTS.WORKFLOWS.CREATE_TEMPLATE, data);
  },
  // Create template from workflow
  async createTemplateFromWorkflow(workflow_id: string, template_name: string, template_description?: string, category?: string) {
    return await apiClient.post<WorkflowTemplateResponse>(API_ENDPOINTS.WORKFLOWS.CREATE_TEMPLATE_FROM_WORKFLOW(workflow_id), {
      template_name,
      template_description,
      category,
    });
  },
  async getDashboardStats() {
    return await apiClient.get<WorkflowStats>(API_ENDPOINTS.WORKFLOWS.DASHBOARD_STATS);
  },
  
  // Execute a workflow (streaming handled elsewhere)
  async executeAdhocWorkflow(data: { flow_data: WorkflowData; input_text: string; session_id?: string }) {
    return await apiClient.post<any>(API_ENDPOINTS.WORKFLOWS.EXECUTE, data);
  },
}; 