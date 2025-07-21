import { create } from 'zustand';

interface ThemeState {
  mode: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (mode: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'light',
  toggleTheme: () => {
    set((state) => ({ mode: state.mode === 'light' ? 'dark' : 'light' }));
  },
  setTheme: (mode) => set({ mode }),
})); 