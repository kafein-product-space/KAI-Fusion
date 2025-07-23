import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "~/stores/auth";

export default function PublicOnlyGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const navigate = useNavigate();
  const { isAuthenticated, initialize, isLoading } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initialize(); // localStorage token varsa kullanıcıyı çek
      setReady(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (ready && isAuthenticated) {
      // Giriş yapmışsa → anasayfa /
      navigate("/", { replace: true });
    }
  }, [ready, isAuthenticated]);

  if (!ready || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  // Giriş yapmamışsa, children'ı (örneğin signin formu) göster
  return <>{children}</>;
}
