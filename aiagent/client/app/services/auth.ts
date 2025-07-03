import { apiClient, TokenManager } from '~/lib/api-client';
import { API_ENDPOINTS } from '~/lib/config';
import type { 
  AuthResponse, 
  SignInRequest, 
  SignUpRequest, 
  User 
} from '~/types/api';

export class AuthService {
  /**
   * Sign up a new user
   */
  static async signUp(data: SignUpRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>(
        API_ENDPOINTS.AUTH.SIGNUP,
        data
      );

      // Store tokens
      TokenManager.setAccessToken(response.access_token);
      TokenManager.setRefreshToken(response.refresh_token);

      return response;
    } catch (error) {
      console.error('Sign up failed:', error);
      throw error;
    }
  }

  /**
   * Sign in an existing user
   */
  static async signIn(data: SignInRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>(
        API_ENDPOINTS.AUTH.SIGNIN,
        data
      );

      // Store tokens
      TokenManager.setAccessToken(response.access_token);
      TokenManager.setRefreshToken(response.refresh_token);

      return response;
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    }
  }

  /**
   * Sign out the current user
   */
  static async signOut(): Promise<void> {
    try {
      // Clear tokens first to prevent auto-retry on 401
      TokenManager.clearTokens();
      
      // Try to call the signout endpoint (optional - might fail if token already expired)
      try {
        await apiClient.post(API_ENDPOINTS.AUTH.SIGNOUT);
      } catch (error) {
        // Ignore errors on signout endpoint - tokens are already cleared
        console.warn('Signout endpoint failed (expected if token expired):', error);
      }
    } catch (error) {
      console.error('Sign out failed:', error);
      // Clear tokens anyway
      TokenManager.clearTokens();
      throw error;
    }
  }

  /**
   * Get current user information
   */
  static async getCurrentUser(): Promise<User> {
    try {
      return await apiClient.get<User>(API_ENDPOINTS.AUTH.ME);
    } catch (error) {
      console.error('Get current user failed:', error);
      throw error;
    }
  }

  /**
   * Refresh the access token
   */
  static async refreshToken(): Promise<AuthResponse> {
    try {
      const refreshToken = TokenManager.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post<AuthResponse>(
        API_ENDPOINTS.AUTH.REFRESH,
        { refresh_token: refreshToken }
      );

      // Update stored tokens
      TokenManager.setAccessToken(response.access_token);
      TokenManager.setRefreshToken(response.refresh_token);

      return response;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear tokens on refresh failure
      TokenManager.clearTokens();
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return TokenManager.hasValidToken();
  }

  /**
   * Get stored access token
   */
  static getAccessToken(): string | null {
    return TokenManager.getAccessToken();
  }

  /**
   * Validate token and get user (useful for route guards)
   */
  static async validateSession(): Promise<User | null> {
    if (!this.isAuthenticated()) {
      return null;
    }

    try {
      return await this.getCurrentUser();
    } catch (error) {
      // Token might be expired or invalid
      console.warn('Session validation failed:', error);
      TokenManager.clearTokens();
      return null;
    }
  }

  /**
   * Clear all authentication data
   */
  static clearAuth(): void {
    TokenManager.clearTokens();
  }
}

export default AuthService; 