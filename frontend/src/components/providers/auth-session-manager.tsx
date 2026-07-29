import { useEffect, type PropsWithChildren } from "react";
import { useNavigate } from "react-router-dom";

import { Spinner } from "@/components/ui/spinner";
import { AUTH_UNAUTHORIZED_EVENT } from "@/lib/auth-events";
import { useAuthStore } from "@/store/auth-store";

export function AuthSessionManager({ children }: PropsWithChildren) {
  const hydrate = useAuthStore((state) => state.hydrate);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const navigate = useNavigate();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const handleUnauthorized = () => {
      void navigate("/login", { replace: true });
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => {
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, [navigate]);

  if (!isHydrated) {
    return (
      <main className="bg-background flex min-h-screen items-center justify-center">
        <Spinner
          className="text-primary size-7"
          label="Chargement de la session"
        />
      </main>
    );
  }

  return children;
}
