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
        <span className="text-gray-500 text-sm">Yükleniyor...</span>
      </div>
    );
  }

  // Giriş yapmamışsa, children'ı (örneğin signin formu) göster
  return <>{children}</>;
}
