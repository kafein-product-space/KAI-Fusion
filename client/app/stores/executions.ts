import { create } from 'zustand';
import * as executionService from '../services/executionService';
import type { WorkflowExecution } from '../types/api';

interface ExecutionsStore {
  executions: WorkflowExecution[];
  currentExecution: WorkflowExecution | null;
  loading: boolean;
  error: string | null;
  fetchExecutions: (workflow_id: string, params?: { skip?: number; limit?: number }) => Promise<void>;
  getExecution: (execution_id: string) => Promise<void>;
  createExecution: (workflow_id: string, inputs: Record<string, any>) => Promise<void>;
  clearError: () => void;
}

export const useExecutionsStore = create<ExecutionsStore>((set) => ({
  executions: [],
  currentExecution: null,
  loading: false,
  error: null,
  fetchExecutions: async (workflow_id, params) => {
    set({ loading: true, error: null });
    try {
      const executions = await executionService.listExecutions(workflow_id, params);
      set({ executions, loading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to fetch executions', loading: false });
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
  clearError: () => set({ error: null }),
})); 