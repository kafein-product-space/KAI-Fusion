// components/AuthGuard.tsx
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { apiClient } from "~/lib/api-client";
import { useAuth } from "~/stores/auth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, setUser, setIsAuthenticated } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Token yoksa signin'e yönlendir
      if (!apiClient.isAuthenticated()) {
        navigate("/signin", { replace: true, state: { from: location } });
        return;
      }

      // 2. Kullanıcı yoksa backend'den çek
      if (!user) {
        try {
          const me = await apiClient.get("/auth/me");
          setUser(me);
          setIsAuthenticated(true);
        } catch (err) {
          // Token bozuksa interceptor zaten yönlendirir
          setUser(null);
          setIsAuthenticated(false);
          navigate("/signin", { replace: true, state: { from: location } });
          return;
        }
      }

      setChecking(false);
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3. Auth kontrolü sırasında loading göster
  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-sm text-gray-500">Loading...</span>
      </div>
    );
  }

  // 4. Kullanıcı yoksa fallback olarak yönlendir (önlem amaçlı)
  if (!isAuthenticated || !user) {
    navigate("/signin", { replace: true, state: { from: location } });
    return null;
  }

  return <>{children}</>;
}
