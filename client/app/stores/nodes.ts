import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import NodeService from '~/services/nodes';
import type { 
  NodeMetadata,
  NodeCategory,
  CustomNode,
  CustomNodeCreateRequest
} from '~/types/api';
import type { StateCreator } from 'zustand'
interface NodeState {
  // State
  nodes: NodeMetadata[];
  categories: NodeCategory[];
  customNodes: CustomNode[];
  filteredNodes: NodeMetadata[];
  selectedCategory: string | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchNodes: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  fetchCustomNodes: () => Promise<void>;
  createCustomNode: (data: CustomNodeCreateRequest) => Promise<CustomNode>;
  updateCustomNode: (id: string, data: Partial<CustomNodeCreateRequest>) => Promise<void>;
  deleteCustomNode: (id: string) => Promise<void>;
  filterByCategory: (category: string | null) => void;
  searchNodes: (query: string) => void;
  clearError: () => void;
}

export const useNodeStore = create<NodeState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    nodes: [],
    categories: [],
    customNodes: [],
    filteredNodes: [],
    selectedCategory: null,
    searchQuery: '',
    isLoading: false,
    error: null,

    // Actions
    fetchNodes: async () => {
      set({ isLoading: true, error: null });
      
      try {
        const nodes = await NodeService.getNodes();

        
        set({ 
          nodes,
          filteredNodes: nodes,
          isLoading: false,
          error: null
        });
      } catch (error: any) {

        set({ 
          nodes: [],
          filteredNodes: [],
          isLoading: false,
          error: error.message || 'Failed to fetch nodes'
        });
        throw error;
      }
    },

    fetchCategories: async () => {
      set({ error: null });
      
      try {
        const categories = await NodeService.getNodeCategories();
        set({ 
          categories,
          error: null
        });
      } catch (error: any) {
        set({ 
          categories: [],
          error: error.message || 'Failed to fetch categories'
        });
        throw error;
      }
    },

    fetchCustomNodes: async () => {
      set({ isLoading: true, error: null });
      
      try {
        const customNodes = await NodeService.getCustomNodes();
        set({ 
          customNodes,
          isLoading: false,
          error: null
        });
      } catch (error: any) {
        set({ 
          customNodes: [],
          isLoading: false,
          error: error.message || 'Failed to fetch custom nodes'
        });
        throw error;
      }
    },

    createCustomNode: async (data: CustomNodeCreateRequest) => {
      set({ isLoading: true, error: null });
      
      try {
        const customNode = await NodeService.createCustomNode(data);
        
        // Add to custom nodes list
        const currentCustomNodes = get().customNodes;
        set({ 
          customNodes: [...currentCustomNodes, customNode],
          isLoading: false,
          error: null
        });
        
        return customNode;
      } catch (error: any) {
        set({ 
          isLoading: false,
          error: error.message || 'Failed to create custom node'
        });
        throw error;
      }
    },

    updateCustomNode: async (id: string, data: Partial<CustomNodeCreateRequest>) => {
      set({ isLoading: true, error: null });
      
      try {
        const updatedNode = await NodeService.updateCustomNode(id, data);
        
        // Update custom nodes list
        const currentCustomNodes = get().customNodes;
        const updatedCustomNodes = currentCustomNodes.map(node => 
          node.id === id ? updatedNode : node
        );
        
        set({ 
          customNodes: updatedCustomNodes,
          isLoading: false,
          error: null
        });
      } catch (error: any) {
        set({ 
          isLoading: false,
          error: error.message || 'Failed to update custom node'
        });
        throw error;
      }
    },

    deleteCustomNode: async (id: string) => {
      set({ isLoading: true, error: null });
      
      try {
        await NodeService.deleteCustomNode(id);
        
        // Remove from custom nodes list
        const currentCustomNodes = get().customNodes;
        const filteredCustomNodes = currentCustomNodes.filter(node => node.id !== id);
        
        set({ 
          customNodes: filteredCustomNodes,
          isLoading: false,
          error: null
        });
      } catch (error: any) {
        set({ 
          isLoading: false,
          error: error.message || 'Failed to delete custom node'
        });
        throw error;
      }
    },

    filterByCategory: (category: string | null) => {
      const { nodes, searchQuery } = get();
      let filtered = nodes;
      
      // Apply category filter
      if (category) {
        filtered = nodes.filter(node => node.category === category);
      }
      
      // Apply search filter if there's a search query
      if (searchQuery) {
        const lowercaseQuery = searchQuery.toLowerCase();
        filtered = filtered.filter(node => 
          node.name.toLowerCase().includes(lowercaseQuery) ||
          node.display_name.toLowerCase().includes(lowercaseQuery) ||
          node.description.toLowerCase().includes(lowercaseQuery)
        );
      }
      
      set({ 
        selectedCategory: category,
        filteredNodes: filtered
      });
    },

    searchNodes: (query: string) => {
      const { nodes, selectedCategory } = get();
      let filtered = nodes;
      
      // Apply category filter if one is selected
      if (selectedCategory) {
        filtered = nodes.filter(node => node.category === selectedCategory);
      }
      
      // Apply search filter
      if (query) {
        const lowercaseQuery = query.toLowerCase();
        filtered = filtered.filter(node => 
          node.name.toLowerCase().includes(lowercaseQuery) ||
          node.display_name.toLowerCase().includes(lowercaseQuery) ||
          node.description.toLowerCase().includes(lowercaseQuery)
        );
      }
      
      set({ 
        searchQuery: query,
        filteredNodes: filtered
      });
    },

    clearError: () => {
      set({ error: null });
    },
  }))
);

// Helper hooks for common node operations
export const useNodes = () => {
  const store = useNodeStore();
  
  return {
    // State
    nodes: store.nodes,
    categories: store.categories,
    customNodes: store.customNodes,
    filteredNodes: store.filteredNodes,
    selectedCategory: store.selectedCategory,
    searchQuery: store.searchQuery,
    isLoading: store.isLoading,
    error: store.error,
    
    // Actions
    fetchNodes: store.fetchNodes,
    fetchCategories: store.fetchCategories,
    fetchCustomNodes: store.fetchCustomNodes,
    createCustomNode: store.createCustomNode,
    updateCustomNode: store.updateCustomNode,
    deleteCustomNode: store.deleteCustomNode,
    filterByCategory: store.filterByCategory,
    searchNodes: store.searchNodes,
    clearError: store.clearError,
  };
};

export default useNodeStore; 