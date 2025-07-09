import { create, StateCreator } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import WorkflowService from '~/services/workflows';
import type {
  Workflow,
  WorkflowCreateRequest,
  WorkflowUpdateRequest,
  WorkflowExecuteRequest,
  WorkflowExecutionResult,
  WorkflowExecution,
  WorkflowData,
} from '~/types/api';

interface WorkflowState {
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  executions: WorkflowExecution[];
  isLoading: boolean;
  isExecuting: boolean;
  error: string | null;
  executionResult: WorkflowExecutionResult | null;
  hasUnsavedChanges: boolean;
  fetchWorkflows: () => Promise<Workflow[]>;
  fetchWorkflow: (id: string) => Promise<void>;
  createWorkflow: (data: WorkflowCreateRequest) => Promise<Workflow>;
  updateWorkflow: (id: string, data: WorkflowUpdateRequest) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  executeWorkflow: (
    data: WorkflowExecuteRequest,
  ) => Promise<WorkflowExecutionResult>;
  validateWorkflow: (
    flowData: WorkflowData,
  ) => Promise<{ valid: boolean; errors?: string[] }>;
  fetchExecutions: (workflowId: string) => Promise<void>;
  setCurrentWorkflow: (workflow: Workflow | null) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  clearError: () => void;
  clearExecutionResult: () => void;
}

const workflowStateCreator: StateCreator<WorkflowState> = (set, get) => ({
  workflows: [],
  currentWorkflow: null,
  executions: [],
  isLoading: false,
  isExecuting: false,
  error: null,
  executionResult: null,
  hasUnsavedChanges: false,
  fetchWorkflows: async () => {
    set({ isLoading: true, error: null });
    try {
      const workflows = await WorkflowService.getWorkflows();
      set({ workflows, isLoading: false });
      return workflows;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  fetchWorkflow: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const workflow = await WorkflowService.getWorkflow(id);
      set({ currentWorkflow: workflow, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  createWorkflow: async (data: WorkflowCreateRequest) => {
    set({ isExecuting: true });
    try {
      const newWorkflow = await WorkflowService.createWorkflow(data);
      set((state: WorkflowState) => ({
        workflows: [...state.workflows, newWorkflow],
        isExecuting: false,
      }));
      return newWorkflow;
    } catch (error: any) {
      set({ error: error.message, isExecuting: false });
      throw error;
    }
  },
  updateWorkflow: async (id: string, data: WorkflowUpdateRequest) => {
    set({ isLoading: true });
    try {
      const updatedWorkflow = await WorkflowService.updateWorkflow(id, data);
      set((state: WorkflowState) => ({
        workflows: state.workflows.map((w: Workflow) =>
          w.id === id ? updatedWorkflow : w,
        ),
        currentWorkflow:
          state.currentWorkflow?.id === id
            ? updatedWorkflow
            : state.currentWorkflow,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  deleteWorkflow: async (id: string) => {
    set({ isLoading: true });
    try {
      await WorkflowService.deleteWorkflow(id);
      set((state: WorkflowState) => ({
        workflows: state.workflows.filter((w: Workflow) => w.id !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  executeWorkflow: async (data: WorkflowExecuteRequest) => {
    set({ isExecuting: true, error: null, executionResult: null });
    try {
      const result = await WorkflowService.executeWorkflow(data);
      set({ executionResult: result, isExecuting: false });
      return result;
    } catch (error: any) {
      set({ error: error.message, isExecuting: false });
      throw error;
    }
  },
  validateWorkflow: async (flowData: WorkflowData) => {
    return await WorkflowService.validateWorkflow(flowData);
  },
  fetchExecutions: async (workflowId: string) => {
    set({ isLoading: true });
    try {
      const executions = await WorkflowService.getWorkflowExecutions(workflowId);
      set({ executions, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
  setCurrentWorkflow: (workflow: Workflow | null) => {
    set({ currentWorkflow: workflow, hasUnsavedChanges: false });
  },
  setHasUnsavedChanges: (hasChanges: boolean) => {
    set({ hasUnsavedChanges: hasChanges });
  },
  clearError: () => set({ error: null }),
  clearExecutionResult: () => set({ executionResult: null }),
});

export const useWorkflows = create<WorkflowState>()(
  subscribeWithSelector(workflowStateCreator),
); 