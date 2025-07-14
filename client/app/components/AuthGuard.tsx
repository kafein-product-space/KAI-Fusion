import React, { useEffect } from "react";
import { useAuthStore } from "~/stores/auth";
import { Navigate, useLocation } from "react-router";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: string;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback = "/signin",
}) => {
  // During development we skip all auth logic so pages render without login.
  if (import.meta.env.DEV) {
    return <>{children}</>;
  }

  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

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
    return (
      <Navigate to={fallback} state={{ from: location.pathname }} replace />
    );
  }

  return <>{children}</>;
};

interface PublicOnlyProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export const PublicOnly: React.FC<PublicOnlyProps> = ({
  children,
  redirectTo = "/home",
}) => {
  // Skip auth checks entirely in development
  if (import.meta.env.DEV) {
    return <>{children}</>;
  }

  const { isAuthenticated, isLoading } = useAuthStore();

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
