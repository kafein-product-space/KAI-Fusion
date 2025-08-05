import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { SmartSuggestionsService } from '~/services/smartSuggestions';
import type { NodeMetadata } from '~/types/api';

interface SmartSuggestionsState {
  // State
  lastAddedNode: string | null;
  recommendedNodes: NodeMetadata[];
  isEnabled: boolean;
  
  // Actions
  setLastAddedNode: (nodeType: string | null) => void;
  updateRecommendations: (availableNodes: NodeMetadata[]) => void;
  clearRecommendations: () => void;
  toggleEnabled: () => void;
  setEnabled: (enabled: boolean) => void;
}

export const useSmartSuggestionsStore = create<SmartSuggestionsState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    lastAddedNode: null,
    recommendedNodes: [],
    isEnabled: true,

    // Actions
    setLastAddedNode: (nodeType: string | null) => {
      set({ lastAddedNode: nodeType });
    },

    updateRecommendations: (availableNodes: NodeMetadata[]) => {
      const { lastAddedNode, isEnabled } = get();
      
      if (!isEnabled || !lastAddedNode) {
        set({ recommendedNodes: [] });
        return;
      }

      const recommendations = SmartSuggestionsService.getRecommendations(
        lastAddedNode,
        availableNodes
      );
      
      set({ recommendedNodes: recommendations });
    },

    clearRecommendations: () => {
      set({ recommendedNodes: [] });
    },

    toggleEnabled: () => {
      const { isEnabled } = get();
      set({ isEnabled: !isEnabled });
    },

    setEnabled: (enabled: boolean) => {
      set({ isEnabled: enabled });
    },
  }))
);

// Helper hook for smart suggestions
export const useSmartSuggestions = () => {
  const store = useSmartSuggestionsStore();
  
  return {
    // State
    lastAddedNode: store.lastAddedNode,
    recommendedNodes: store.recommendedNodes,
    isEnabled: store.isEnabled,
    
    // Actions
    setLastAddedNode: store.setLastAddedNode,
    updateRecommendations: store.updateRecommendations,
    clearRecommendations: store.clearRecommendations,
    toggleEnabled: store.toggleEnabled,
    setEnabled: store.setEnabled,
  };
};

export default useSmartSuggestionsStore; 