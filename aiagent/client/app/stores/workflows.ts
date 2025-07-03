import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import WorkflowService from '~/services/workflows';
import type { 
  Workflow, 
  WorkflowCreateRequest, 
  WorkflowUpdateRequest,
  WorkflowExecuteRequest,
  WorkflowExecutionResult,
  WorkflowExecution,
  WorkflowData
} from '~/types/api';

interface WorkflowState {
  // State
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  executions: WorkflowExecution[];
  isLoading: boolean;
  isExecuting: boolean;
  error: string | null;
  executionResult: WorkflowExecutionResult | null;
  
  // Actions
  fetchWorkflows: () => Promise<void>;
  fetchWorkflow: (id: string) => Promise<void>;
  createWorkflow: (data: WorkflowCreateRequest) => Promise<Workflow>;
  updateWorkflow: (id: string, data: WorkflowUpdateRequest) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  executeWorkflow: (data: WorkflowExecuteRequest) => Promise<WorkflowExecutionResult>;
  validateWorkflow: (flowData: WorkflowData) => Promise<{ valid: boolean; errors?: string[] }>;
  fetchExecutions: (workflowId: string) => Promise<void>;
  setCurrentWorkflow: (workflow: Workflow | null) => void;
  clearError: () => void;
  clearExecutionResult: () => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    workflows: [],
    currentWorkflow: null,
    executions: [],
    isLoading: false,
    isExecuting: false,
    error: null,
    executionResult: null,

    // Actions
    fetchWorkflows: async () => {
      set({ isLoading: true, error: null });
      
      try {
        const workflows = await WorkflowService.getWorkflows();
        set({ 
          workflows,
          isLoading: false,
          error: null
        });
      } catch (error: any) {
        set({ 
          workflows: [],
          isLoading: false,
          error: error.message || 'Failed to fetch workflows'
        });
        throw error;
      }
    },

    fetchWorkflow: async (id: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const workflow = await WorkflowService.getWorkflow(id);
        set({ 
          currentWorkflow: workflow,
          isLoading: false,
          error: null
        });
      } catch (error: any) {
        set({ 
          currentWorkflow: null,
          isLoading: false,
          error: error.message || 'Failed to fetch workflow'
        });
        throw error;
      }
    },

    createWorkflow: async (data: WorkflowCreateRequest) => {
      set({ isLoading: true, error: null });
      
      try {
        const workflow = await WorkflowService.createWorkflow(data);
        
        // Add to workflows list
        const currentWorkflows = get().workflows;
        set({ 
          workflows: [...currentWorkflows, workflow],
          currentWorkflow: workflow,
          isLoading: false,
          error: null
        });
        
        return workflow;
      } catch (error: any) {
        set({ 
          isLoading: false,
          error: error.message || 'Failed to create workflow'
        });
        throw error;
      }
    },

    updateWorkflow: async (id: string, data: WorkflowUpdateRequest) => {
      set({ isLoading: true, error: null });
      
      try {
        const updatedWorkflow = await WorkflowService.updateWorkflow(id, data);
        
        // Update workflows list
        const currentWorkflows = get().workflows;
        const updatedWorkflows = currentWorkflows.map(w => 
          w.id === id ? updatedWorkflow : w
        );
        
        set({ 
          workflows: updatedWorkflows,
          currentWorkflow: get().currentWorkflow?.id === id ? updatedWorkflow : get().currentWorkflow,
          isLoading: false,
          error: null
        });
      } catch (error: any) {
        set({ 
          isLoading: false,
          error: error.message || 'Failed to update workflow'
        });
        throw error;
      }
    },

    deleteWorkflow: async (id: string) => {
      set({ isLoading: true, error: null });
      
      try {
        await WorkflowService.deleteWorkflow(id);
        
        // Remove from workflows list
        const currentWorkflows = get().workflows;
        const filteredWorkflows = currentWorkflows.filter(w => w.id !== id);
        
        set({ 
          workflows: filteredWorkflows,
          currentWorkflow: get().currentWorkflow?.id === id ? null : get().currentWorkflow,
          isLoading: false,
          error: null
        });
      } catch (error: any) {
        set({ 
          isLoading: false,
          error: error.message || 'Failed to delete workflow'
        });
        throw error;
      }
    },

    executeWorkflow: async (data: WorkflowExecuteRequest) => {
      set({ isExecuting: true, error: null, executionResult: null });
      
      try {
        const result = await WorkflowService.executeWorkflow(data);
        
        set({ 
          executionResult: result,
          isExecuting: false,
          error: null
        });
        
        return result;
      } catch (error: any) {
        set({ 
          executionResult: null,
          isExecuting: false,
          error: error.message || 'Failed to execute workflow'
        });
        throw error;
      }
    },

    validateWorkflow: async (flowData: WorkflowData) => {
      try {
        return await WorkflowService.validateWorkflow(flowData);
      } catch (error: any) {
        console.error('Workflow validation failed:', error);
        throw error;
      }
    },

    fetchExecutions: async (workflowId: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const executions = await WorkflowService.getWorkflowExecutions(workflowId);
        set({ 
          executions,
          isLoading: false,
          error: null
        });
      } catch (error: any) {
        set({ 
          executions: [],
          isLoading: false,
          error: error.message || 'Failed to fetch executions'
        });
        throw error;
      }
    },

    setCurrentWorkflow: (workflow: Workflow | null) => {
      set({ currentWorkflow: workflow });
    },

    clearError: () => {
      set({ error: null });
    },

    clearExecutionResult: () => {
      set({ executionResult: null });
    },
  }))
);

// Helper hooks for common workflow operations
export const useWorkflows = () => {
  const store = useWorkflowStore();
  
  return {
    // State
    workflows: store.workflows,
    currentWorkflow: store.currentWorkflow,
    executions: store.executions,
    isLoading: store.isLoading,
    isExecuting: store.isExecuting,
    error: store.error,
    executionResult: store.executionResult,
    
    // Actions
    fetchWorkflows: store.fetchWorkflows,
    fetchWorkflow: store.fetchWorkflow,
    createWorkflow: store.createWorkflow,
    updateWorkflow: store.updateWorkflow,
    deleteWorkflow: store.deleteWorkflow,
    executeWorkflow: store.executeWorkflow,
    validateWorkflow: store.validateWorkflow,
    fetchExecutions: store.fetchExecutions,
    setCurrentWorkflow: store.setCurrentWorkflow,
    clearError: store.clearError,
    clearExecutionResult: store.clearExecutionResult,
  };
};

export default useWorkflowStore; 