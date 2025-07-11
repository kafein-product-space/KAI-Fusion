import { create } from 'zustand';

interface AuthState {
  user: any; // Kullanıcı modeline göre değiştir
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: any) => void;
  setIsAuthenticated: (auth: boolean) => void;
  logout: () => void;
  validateSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  setUser: (user) => set({ user }),
  setIsAuthenticated: (auth) => set({ isAuthenticated: auth }),
  logout: () => set({ user: null, isAuthenticated: false }),
  validateSession: () => set({ isLoading: true }),
}));