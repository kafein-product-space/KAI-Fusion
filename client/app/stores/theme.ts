import { create } from 'zustand';

interface ThemeState {
  mode: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (mode: 'light' | 'dark') => void;
}

// Read initial theme from localStorage
const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('theme_mode');
    if (stored === 'dark' || stored === 'light') return stored;
  }
  return 'light';
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: getInitialTheme(),
  toggleTheme: () => {
    set((state) => {
      const newMode = state.mode === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme_mode', newMode);
      return { mode: newMode };
    });
  },
  setTheme: (mode) => {
    localStorage.setItem('theme_mode', mode);
    set({ mode });
  },
})); 