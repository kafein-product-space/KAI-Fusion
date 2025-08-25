import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import AuthService from '~/services/authService';
import type { 
  UserResponse, 
  SignUpRequest, 
  SignInRequest,
  AuthResponse 
} from '~/services/authService';

interface AuthState {
  // State
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  signUp: (data: SignUpRequest) => Promise<void>;
  signIn: (data: SignInRequest) => Promise<void>;
  signOut: () => Promise<void>;
  getProfile: () => Promise<void>;
  clearError: () => void;
  setUser: (user: UserResponse | null) => void;
  setIsAuthenticated: (auth: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    // Initialize auth state from localStorage
    initialize: async () => {
      const accessToken = localStorage.getItem('auth_access_token');
      if (accessToken) {
        set({ isAuthenticated: true, isLoading: true });
        try {
          const user = await AuthService.getProfile();
          set({ 
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
        } catch (error: any) {
          // Token expired or invalid, clear it
          localStorage.removeItem('auth_access_token');
          localStorage.removeItem('auth_refresh_token');
          set({ 
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        }
      } else {
        // Token yoksa direkt false state'e set et
        set({ 
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      }
    },

    // Actions
    signUp: async (data: SignUpRequest) => {
      set({ isLoading: true, error: null });
      
      try {
        const response: AuthResponse = await AuthService.signUp(data);
        
        // Store tokens in localStorage
        localStorage.setItem('auth_access_token', response.access_token);
        localStorage.setItem('auth_refresh_token', response.refresh_token);
        
        set({ 
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      } catch (error: any) {
        set({ 
          isLoading: false,
          error: error.response?.data?.detail || error.message || 'Failed to sign up'
        });
        throw error;
      }
    },

    signIn: async (data: SignInRequest) => {
      set({ isLoading: true, error: null });
      
      try {
        const response: AuthResponse = await AuthService.signIn(data);
        
        // Store tokens in localStorage
        localStorage.setItem('auth_access_token', response.access_token);
        localStorage.setItem('auth_refresh_token', response.refresh_token);
        
        set({ 
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      } catch (error: any) {
        set({ 
          isLoading: false,
          error: error.response?.data?.detail || error.message || 'Failed to sign in'
        });
        throw error;
      }
    },

    signOut: async () => {
      // Önce state'i temizle
      set({ 
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
      
      // Clear tokens from localStorage
      localStorage.removeItem('auth_access_token');
      localStorage.removeItem('auth_refresh_token');
      
      // API call'u background'da yap
      try {
        await AuthService.signOut();
      } catch (error) {
        console.error('Sign out API call failed:', error);
      }
    },

    getProfile: async () => {
      set({ isLoading: true, error: null });
      
      try {
        const user = await AuthService.getProfile();
        set({ 
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      } catch (error: any) {
        set({ 
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: error.message || 'Failed to get profile'
        });
        throw error;
      }
    },

    clearError: () => {
      set({ error: null });
    },

    setUser: (user: UserResponse | null) => {
      set({ user });
    },

    setIsAuthenticated: (isAuthenticated: boolean) => {
      set({ isAuthenticated });
    },
  }))
);

// Helper hook for common auth operations
export const useAuth = () => {
  const store = useAuthStore();
  
  return {
    // State
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    
    // Actions
    initialize: store.initialize,
    signUp: store.signUp,
    signIn: store.signIn,
    signOut: store.signOut,
    getProfile: store.getProfile,
    clearError: store.clearError,
    setUser: store.setUser,
    setIsAuthenticated: store.setIsAuthenticated,
  };
};

export default useAuthStore;