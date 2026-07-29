import type { PropsWithChildren } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { useAuthStore } from "@/store/auth-store";

export function PublicRoute({ children }: PropsWithChildren) {
  const isAuthenticated = useAuthStore((state) => Boolean(state.accessToken));

  if (isAuthenticated) {
    return <Navigate replace to="/app" />;
  }

  return children ?? <Outlet />;
}
