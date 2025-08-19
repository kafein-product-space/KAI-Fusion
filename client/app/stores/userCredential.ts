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
      // Auto-increment name suffix if duplicates exist for this user
      const baseName = (data.name || '').trim() || 'Credential';
      const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`^${escapeRegExp(baseName)}(?:\\s(\\d+))?$`);
      const usedNumbers = new Set<number>();
      for (const cred of get().userCredentials) {
        const match = re.exec(cred.name);
        if (match) {
          if (match[1]) {
            const n = parseInt(match[1], 10);
            if (!Number.isNaN(n)) usedNumbers.add(n);
          } else {
            // Base name without suffix counts as 1
            usedNumbers.add(1);
          }
        }
      }
      let finalName = baseName;
      if (usedNumbers.has(1)) {
        // Find smallest available suffix >= 2
        let n = 2;
        while (usedNumbers.has(n)) n += 1;
        finalName = `${baseName} ${n}`;
      }
      const payload = { ...data, name: finalName };
      const created = await createUserCredential(payload);
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