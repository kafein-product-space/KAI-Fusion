import { create } from 'zustand';

interface UserCredential {
  id: string | number;
  // Diğer alanlar eklenebilir
}

interface UserCredentialStore {
  userCredentials: UserCredential[];
  setUserCredentials: (userCredentials: UserCredential[]) => void;
  addUserCredential: (userCredential: UserCredential) => void;
  updateUserCredential: (userCredential: UserCredential) => void;
  removeUserCredential: (id: string | number) => void;
}

export const useUserCredentialStore = create<UserCredentialStore>((set) => ({
  userCredentials: [],
  setUserCredentials: (userCredentials) => set({ userCredentials }),
  addUserCredential: (userCredential) => set((state) => ({ userCredentials: [...state.userCredentials, userCredential] })),
  updateUserCredential: (userCredential) => set((state) => ({ userCredentials: state.userCredentials.map((u) => (u.id === userCredential.id ? userCredential : u)) })),
  removeUserCredential: (id) => set((state) => ({ userCredentials: state.userCredentials.filter((u) => u.id !== id) })),
})); 