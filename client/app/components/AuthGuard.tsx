import React, { useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuthStore } from "~/stores/auth";

// 🔐 PRIVATE ROUTE GUARD
interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: string; // Default: /signin
}

export const AuthGuard = ({
  children,
  fallback = "/signin",
}: AuthGuardProps) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const initialize = useAuthStore.getState().initialize; // 🧠 Direkt referans

  const initialized = useRef(false); // 👈 sadece bir kez çalışsın

  const location = useLocation();

  useEffect(() => {
    if (typeof window !== "undefined" && !initialized.current) {
      initialize();
      initialized.current = true;
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <Navigate to={fallback} state={{ from: location.pathname }} replace />
    );
  }

  return <>{children}</>;
};

// 🌐 PUBLIC ONLY GUARD
interface PublicOnlyProps {
  children: React.ReactNode;
  redirectTo?: string; // Default: /
}

export const PublicOnly = ({ children, redirectTo = "/" }: PublicOnlyProps) => {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();

  // ✅ Initialize sadece tarayıcıda
  useEffect(() => {
    if (typeof window !== "undefined") {
      initialize();
    }
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};

export default AuthGuard;
