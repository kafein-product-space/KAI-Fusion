import React from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import AuthService from '~/services/auth';
import type { User, SignInRequest, SignUpRequest } from '~/types/api';

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  signIn: (credentials: SignInRequest) => Promise<void>;
  signUp: (userData: SignUpRequest) => Promise<void>;
  signOut: () => Promise<void>;
  validateSession: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    // Actions
    signIn: async (credentials: SignInRequest) => {
      set({ isLoading: true, error: null });
      
      try {
        const response = await AuthService.signIn(credentials);
        
        set({ 
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      } catch (error: any) {
        set({ 
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: error.message || 'Sign in failed'
        });
        throw error;
      }
    },

    signUp: async (userData: SignUpRequest) => {
      set({ isLoading: true, error: null });
      
      try {
        const response = await AuthService.signUp(userData);
        
        set({ 
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      } catch (error: any) {
        set({ 
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: error.message || 'Sign up failed'
        });
        throw error;
      }
    },

    signOut: async () => {
      set({ isLoading: true });
      
      try {
        await AuthService.signOut();
        
        set({ 
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      } catch (error: any) {
        // Even if signout fails, clear local state
        set({ 
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
        
        console.warn('Sign out error (local state cleared):', error);
      }
    },

    validateSession: async () => {
      // Don't show loading for session validation
      const currentUser = get().user;
      
      try {
        const user = await AuthService.validateSession();
        
        if (user) {
          set({ 
            user,
            isAuthenticated: true,
            error: null
          });
        } else {
          set({ 
            user: null,
            isAuthenticated: false,
            error: null
          });
        }
      } catch (error: any) {
        set({ 
          user: null,
          isAuthenticated: false,
          error: null // Don't show error for failed session validation
        });
      }
    },

    clearError: () => {
      set({ error: null });
    },

    setLoading: (loading: boolean) => {
      set({ isLoading: loading });
    },
  }))
);

// Helper hooks for common auth operations
export const useAuth = () => {
  const store = useAuthStore();
  
  return {
    // State
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    
    // Actions
    signIn: store.signIn,
    signUp: store.signUp,
    signOut: store.signOut,
    validateSession: store.validateSession,
    clearError: store.clearError,
  };
};

// Hook for auth guards
export const useAuthGuard = () => {
  const { isAuthenticated, validateSession } = useAuth();
  
  // Initialize session validation on mount
  React.useEffect(() => {
    if (!isAuthenticated) {
      validateSession();
    }
  }, [isAuthenticated, validateSession]);
  
  return { isAuthenticated };
}; 