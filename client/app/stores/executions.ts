import { create } from 'zustand';
import * as executionService from '../services/executionService';
import type { WorkflowExecution } from '../types/api';

interface ExecutionsStore {
  executions: WorkflowExecution[];
  currentExecution: WorkflowExecution | null;
  loading: boolean;
  error: string | null;
  fetchExecutions: (workflow_id?: string, params?: { skip?: number; limit?: number }) => Promise<void>;
  fetchAllExecutions: () => Promise<void>;
  getExecution: (execution_id: string) => Promise<void>;
  createExecution: (workflow_id: string, inputs: Record<string, any>) => Promise<void>;
  executeWorkflow: (workflow_id: string, executionData: {
    flow_data: any;
    input_text: string;
    node_id?: string;
    execution_type?: string;
    trigger_source?: string;
  }) => Promise<void>;
  setCurrentExecution: (execution: WorkflowExecution) => void;
  deleteExecution: (execution_id: string) => Promise<void>;
  clearError: () => void;
}

export const useExecutionsStore = create<ExecutionsStore>((set) => ({
  executions: [],
  currentExecution: null,
  loading: false,
  error: null,
  fetchExecutions: async (workflow_id, params) => {
    if (!workflow_id) {
      set({ executions: [], loading: false, error: null });
      return;
    }
    set({ loading: true, error: null });
    try {
      const executions = await executionService.listExecutions(workflow_id, params);
      set({ executions, loading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to fetch executions', loading: false });
    }
  },
  fetchAllExecutions: async () => {
    set({ loading: true, error: null });
    try {
      const executions = await executionService.listExecutions(); // workflow_id olmadan çağır
      set({ executions, loading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to fetch all executions', loading: false });
    }
  },
  getExecution: async (execution_id) => {
    set({ loading: true, error: null });
    try {
      const execution = await executionService.getExecution(execution_id);
      set({ currentExecution: execution, loading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to fetch execution', loading: false });
    }
  },
  createExecution: async (workflow_id, inputs) => {
    set({ loading: true, error: null });
    try {
      const execution = await executionService.createExecution(workflow_id, inputs);
      set((state) => ({ executions: [execution, ...state.executions], loading: false }));
    } catch (e: any) {
      set({ error: e.message || 'Failed to create execution', loading: false });
    }
  },
  executeWorkflow: async (workflow_id, executionData) => {
    set({ loading: true, error: null });
    try {
      const execution = await executionService.executeWorkflow(workflow_id, executionData);
      set((state) => ({ 
        currentExecution: execution, 
        executions: [execution, ...state.executions], 
        loading: false 
      }));
    } catch (e: any) {
      set({ error: e.message || 'Failed to execute workflow', loading: false });
    }
  },
  setCurrentExecution: (execution) => set({ currentExecution: execution }),
  deleteExecution: async (execution_id) => {
    set({ loading: true, error: null });
    try {
      await executionService.deleteExecution(execution_id);
      set((state) => ({
        executions: state.executions.filter(ex => ex.id !== execution_id),
        loading: false
      }));
    } catch (e: any) {
      set({ error: e.message || 'Failed to delete execution', loading: false });
    }
  },
  clearError: () => set({ error: null }),
})); 