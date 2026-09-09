import type { PropsWithChildren } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuthStore } from "@/store/auth-store";
import { authStateWithDestination } from "@/features/auth/redirect";

export function ProtectedRoute({ children }: PropsWithChildren) {
  const isAuthenticated = useAuthStore((state) => Boolean(state.accessToken));
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        replace
        state={authStateWithDestination(location)}
        to="/login"
      />
    );
  }

  return children ?? <Outlet />;
}
