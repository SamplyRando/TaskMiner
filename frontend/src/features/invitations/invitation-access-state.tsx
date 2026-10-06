import { FileQuestion, ShieldAlert } from "lucide-react";

import { ApiError } from "@/api/client";
import { cn } from "@/lib/utils";

type InvitationAccessStateProps = {
  error: unknown;
};

export function InvitationAccessState({ error }: InvitationAccessStateProps) {
  const notFound = error instanceof ApiError && error.status === 404;
  const Icon = notFound ? FileQuestion : ShieldAlert;

  return (
    <div
      className={cn(
        "rounded-card flex min-h-56 flex-col items-center justify-center border px-6 text-center",
        notFound ? "bg-card" : "border-warning-border bg-warning-subtle",
      )}
    >
      <span
        className={cn(
          "flex size-11 items-center justify-center rounded-lg border",
          notFound
            ? "bg-surface-sunken text-muted-foreground"
            : "bg-surface border-warning-border text-warning",
        )}
      >
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <p className="mt-4 font-semibold tracking-tight">
        {notFound ? "Workspace introuvable" : "Accès aux invitations restreint"}
      </p>
      <p className="text-muted-foreground mt-1.5 max-w-lg text-sm leading-relaxed">
        {notFound
          ? "Ce workspace n’existe pas ou n’est plus accessible."
          : "Seuls les propriétaires et administrateurs peuvent consulter et gérer les invitations de ce workspace."}
      </p>
    </div>
  );
}
