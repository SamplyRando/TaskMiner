import type { ReactNode } from "react";

import { AuthShell } from "@/features/auth/components/auth-shell";

type AccountActionCardProps = {
  children: ReactNode;
  description: string;
  title: string;
};

/** Account actions (verification, password reset) share the auth shell. */
export function AccountActionCard({
  children,
  description,
  title,
}: AccountActionCardProps) {
  return (
    <AuthShell description={description} title={title}>
      {children}
    </AuthShell>
  );
}
