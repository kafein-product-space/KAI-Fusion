// components/AuthGuard.tsx
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { apiClient } from "~/lib/api-client";
import { useAuth } from "~/stores/auth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, setUser, setIsAuthenticated } = useAuth();
  const [checking, setChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Token yoksa signin'e yönlendir
      if (!apiClient.isAuthenticated()) {
        setShouldRedirect(true);
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
          setShouldRedirect(true);
          return;
        }
      }

      setChecking(false);
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect effect
  useEffect(() => {
    if (shouldRedirect) {
      navigate("/signin", { replace: true, state: { from: location } });
    }
  }, [shouldRedirect, navigate, location]);

  // 3. Auth kontrolü sırasında loading göster
  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  // 4. Kullanıcı yoksa fallback olarak yönlendir (önlem amaçlı)
  if (!isAuthenticated || !user) {
    setShouldRedirect(true);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
