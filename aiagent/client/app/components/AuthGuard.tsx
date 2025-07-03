import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '~/stores/auth';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallback = '/signin' 
}) => {
  const { isAuthenticated, validateSession, isLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Validate session on mount and when location changes
    if (!isAuthenticated) {
      validateSession();
    }
  }, [isAuthenticated, validateSession, location.pathname]);

  // Show loading state while validating session
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Redirect to signin if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={fallback} state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

interface PublicOnlyProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const PublicOnly: React.FC<PublicOnlyProps> = ({ 
  children, 
  redirectTo = '/home' 
}) => {
  const { isAuthenticated, validateSession, isLoading } = useAuth();

  useEffect(() => {
    // Validate session to check if user is authenticated
    validateSession();
  }, [validateSession]);

  // Show loading state while validating session
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Redirect to home if already authenticated
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default AuthGuard; 