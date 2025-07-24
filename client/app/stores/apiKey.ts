import { create } from 'zustand';
import ApiKeyService from '../services/apiKeyService';
import type { ApiKey, ApiKeyCreateRequest, ApiKeyUpdateRequest, ApiKeyCreateResponse } from '~/types/api';

interface ApiKeyStore {
  apiKeys: ApiKey[];
  isLoading: boolean;
  error: string | null;
  fetchApiKeys: () => Promise<void>;
  addApiKey: (data: ApiKeyCreateRequest) => Promise<ApiKeyCreateResponse | undefined>;
  updateApiKey: (id: string, data: ApiKeyUpdateRequest) => Promise<void>;
  removeApiKey: (id: string) => Promise<void>;
}

export const useApiKeyStore = create<ApiKeyStore>((set, get) => ({
  apiKeys: [],
  isLoading: false,
  error: null,

  fetchApiKeys: async () => {
    set({ isLoading: true, error: null });
    try {
      const keys = await ApiKeyService.list();
      set({ apiKeys: keys, isLoading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to fetch API keys', isLoading: false });
    }
  },

  addApiKey: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const created = await ApiKeyService.create(data);
      set((state) => ({
        apiKeys: [...state.apiKeys, created],
        isLoading: false,
      }));
      return created;
    } catch (e: any) {
      set({ error: e.message || 'Failed to add API key', isLoading: false });
    }
  },

  updateApiKey: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await ApiKeyService.update(id, data);
      set((state) => ({
        apiKeys: state.apiKeys.map((k) => (k.id === updated.id ? updated : k)),
        isLoading: false,
      }));
    } catch (e: any) {
      set({ error: e.message || 'Failed to update API key', isLoading: false });
    }
  },

  removeApiKey: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await ApiKeyService.delete(id);
      set((state) => ({
        apiKeys: state.apiKeys.filter((k) => k.id !== id),
        isLoading: false,
      }));
    } catch (e: any) {
      set({ error: e.message || 'Failed to delete API key', isLoading: false });
    }
  },
})); 