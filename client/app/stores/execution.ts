import { create } from 'zustand';

interface Execution {
  id: string | number;
  // Diğer alanlar eklenebilir
}

interface ExecutionStore {
  executions: Execution[];
  setExecutions: (executions: Execution[]) => void;
  addExecution: (execution: Execution) => void;
  updateExecution: (execution: Execution) => void;
  removeExecution: (id: string | number) => void;
}

export const useExecutionStore = create<ExecutionStore>((set) => ({
  executions: [],
  setExecutions: (executions) => set({ executions }),
  addExecution: (execution) => set((state) => ({ executions: [...state.executions, execution] })),
  updateExecution: (execution) => set((state) => ({ executions: state.executions.map((e) => (e.id === execution.id ? execution : e)) })),
  removeExecution: (id) => set((state) => ({ executions: state.executions.filter((e) => e.id !== id) })),
})); 