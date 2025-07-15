import { apiClient } from '~/lib/api-client';
import { API_ENDPOINTS } from '~/lib/config';

// Auth types
export interface SignUpRequest {
  user: {
    email: string;
    name: string;
    credential: string;
    tempToken?: string;
  };
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  last_login?: string;
}

export interface AuthResponse {
  user: UserResponse;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface UserUpdateProfile {
  full_name?: string;
  password?: string;
}

export class AuthService {
  /**
   * User registration
   */
  static async signUp(data: SignUpRequest): Promise<AuthResponse> {
    try {
      return await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.SIGNUP, data);
    } catch (error) {
      console.error('Failed to sign up:', error);
      throw error;
    }
  }

  /**
   * User sign in
   */
  static async signIn(data: SignInRequest): Promise<AuthResponse> {
    try {
      return await apiClient.post<AuthResponse>(API_ENDPOINTS.AUTH.SIGNIN, data);
    } catch (error) {
      console.error('Failed to sign in:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      return await apiClient.post<TokenResponse>(API_ENDPOINTS.AUTH.REFRESH, {
        refresh_token: refreshToken
      });
    } catch (error) {
      console.error('Failed to refresh token:', error);
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(): Promise<UserResponse> {
    try {
      return await apiClient.get<UserResponse>(API_ENDPOINTS.AUTH.ME);
    } catch (error) {
      console.error('Failed to get profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(data: UserUpdateProfile): Promise<UserResponse> {
    try {
      return await apiClient.put<UserResponse>(API_ENDPOINTS.AUTH.ME, data);
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }

  /**
   * Sign out
   */
  static async signOut(): Promise<{ message: string }> {
    try {
      return await apiClient.post<{ message: string }>(API_ENDPOINTS.AUTH.SIGNOUT);
    } catch (error) {
      console.error('Failed to sign out:', error);
      throw error;
    }
  }

  /**
   * Check auth service health
   */
  static async healthCheck(): Promise<any> {
    try {
      return await apiClient.get(`${API_ENDPOINTS.AUTH.ME.replace('/me', '/health')}`);
    } catch (error) {
      console.error('Failed to check auth health:', error);
      throw error;
    }
  }
}

export default AuthService; 