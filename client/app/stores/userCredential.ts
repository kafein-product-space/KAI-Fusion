import { create } from 'zustand';
import {
  getUserCredentials,
  createUserCredential,
  updateUserCredential,
  deleteUserCredential,
} from '~/services/userCredentialService';
import type { UserCredential, CredentialCreateRequest } from '~/types/api';

interface UserCredentialStore {
  userCredentials: UserCredential[];
  isLoading: boolean;
  error: string | null;
  fetchCredentials: () => Promise<void>;
  addCredential: (data: CredentialCreateRequest) => Promise<UserCredential>;
  updateCredential: (id: string, data: Partial<CredentialCreateRequest>) => Promise<void>;
  removeCredential: (id: string) => Promise<void>;
}

export const useUserCredentialStore = create<UserCredentialStore>((set, get) => ({
  userCredentials: [],
  isLoading: false,
  error: null,

  fetchCredentials: async () => {
    set({ isLoading: true, error: null });
    try {
      const creds = await getUserCredentials();
      set({ userCredentials: creds, isLoading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to fetch credentials', isLoading: false });
    }
  },

  addCredential: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const created = await createUserCredential(data);
      set((state) => ({
        userCredentials: [...state.userCredentials, created],
        isLoading: false,
      }));
      return created;
    } catch (e: any) {
      set({ error: e.message || 'Failed to add credential', isLoading: false });
      throw e;
    }
  },

  updateCredential: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await updateUserCredential(id, data);
      set((state) => ({
        userCredentials: state.userCredentials.map((u) =>
          u.id === updated.id ? updated : u
        ),
        isLoading: false,
      }));
    } catch (e: any) {
      set({ error: e.message || 'Failed to update credential', isLoading: false });
    }
  },

  removeCredential: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await deleteUserCredential(id);
      set((state) => ({
        userCredentials: state.userCredentials.filter((u) => u.id !== id),
        isLoading: false,
      }));
    } catch (e: any) {
      set({ error: e.message || 'Failed to delete credential', isLoading: false });
    }
  },
})); 