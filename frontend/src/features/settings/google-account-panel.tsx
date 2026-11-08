import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Link2 } from "lucide-react";

import { getGoogleLinkStatus } from "@/api/auth";
import { FormError } from "@/components/form-error";
import { GoogleAuthButton } from "@/features/auth/components/google-auth-button";
import { SettingsSectionCard } from "@/features/settings/settings-section-card";
import type { GoogleLinkResponse, GoogleLinkStatus } from "@/types/auth";

const googleLinkQueryKey = ["auth", "google", "link"] as const;

type GoogleAccountPanelProps = {
  onSuccess: (message: string) => void;
};

export function GoogleAccountPanel({ onSuccess }: GoogleAccountPanelProps) {
  const queryClient = useQueryClient();
  const isConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim());
  const status = useQuery({
    queryKey: googleLinkQueryKey,
    queryFn: getGoogleLinkStatus,
    enabled: isConfigured,
  });

  if (!isConfigured) return null;

  const handleLinked = (result: GoogleLinkResponse) => {
    queryClient.setQueryData<GoogleLinkStatus>(googleLinkQueryKey, {
      linked: result.linked,
    });
    onSuccess(result.message);
  };

  return (
    <SettingsSectionCard
      description="Liez votre compte Google après vous être authentifié sur TaskMiner. Aucun compte n’est fusionné sur la seule base de l’adresse e-mail."
      icon={<Link2 aria-hidden="true" className="text-primary size-5" />}
      title="Connexion Google"
    >
      {status.isPending ? (
        <p className="text-muted-foreground text-sm" role="status">
          Vérification de la liaison Google…
        </p>
      ) : status.data?.linked ? (
        <p className="text-success flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 aria-hidden="true" className="size-4" />
          Google est lié à ce compte TaskMiner.
        </p>
      ) : (
        <div className="max-w-sm space-y-3">
          <p className="text-muted-foreground text-sm">
            Utilisez le compte Google portant la même adresse que votre compte
            TaskMiner.
          </p>
          <GoogleAuthButton mode="link" onSuccess={handleLinked} />
        </div>
      )}
      <FormError error={status.error} />
    </SettingsSectionCard>
  );
}
