import { FileQuestion, ShieldAlert } from "lucide-react";

import { ApiError } from "@/api/client";

type InvitationAccessStateProps = {
  error: unknown;
};

export function InvitationAccessState({ error }: InvitationAccessStateProps) {
  const notFound = error instanceof ApiError && error.status === 404;
  const Icon = notFound ? FileQuestion : ShieldAlert;

  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-6 text-center">
      <Icon aria-hidden="true" className="size-8 text-amber-700" />
      <p className="mt-3 font-medium">
        {notFound ? "Workspace introuvable" : "Accès aux invitations restreint"}
      </p>
      <p className="mt-1 max-w-lg text-sm text-amber-900/80">
        {notFound
          ? "Ce workspace n’existe pas ou n’est plus accessible."
          : "Seuls les propriétaires et administrateurs peuvent consulter et gérer les invitations de ce workspace."}
      </p>
    </div>
  );
}
