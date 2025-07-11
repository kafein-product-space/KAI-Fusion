import { create } from 'zustand';

interface Workflow {
  id: string | number;
  // Diğer alanlar eklenebilir
}

interface WorkflowStore {
  workflows: Workflow[];
  setWorkflows: (workflows: Workflow[]) => void;
  addWorkflow: (workflow: Workflow) => void;
  updateWorkflow: (workflow: Workflow) => void;
  removeWorkflow: (id: string | number) => void;
}

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  workflows: [],
  setWorkflows: (workflows) => set({ workflows }),
  addWorkflow: (workflow) => set((state) => ({ workflows: [...state.workflows, workflow] })),
  updateWorkflow: (workflow) => set((state) => ({ workflows: state.workflows.map((w) => (w.id === workflow.id ? workflow : w)) })),
  removeWorkflow: (id) => set((state) => ({ workflows: state.workflows.filter((w) => w.id !== id) })),
})); 