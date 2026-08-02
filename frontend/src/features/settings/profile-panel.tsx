import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { FormError } from "@/components/form-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { formatDateTime } from "@/lib/format";
import {
  profileSchema,
  type ProfileFormValues,
} from "@/features/settings/schemas";
import { SettingsSectionCard } from "@/features/settings/settings-section-card";
import { useUpdateSettingsProfile } from "@/features/settings/hooks";
import type { SettingsProfile } from "@/types/settings";

type ProfilePanelProps = {
  profile: SettingsProfile;
  onSuccess: (message: string) => void;
};

export function ProfilePanel({ profile, onSuccess }: ProfilePanelProps) {
  const updateProfile = useUpdateSettingsProfile();
  const initials = profile.full_name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.at(0))
    .join("")
    .toUpperCase();
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      avatarUrl: profile.avatar_url ?? "",
      fullName: profile.full_name,
    },
  });

  useEffect(() => {
    reset({ avatarUrl: profile.avatar_url ?? "", fullName: profile.full_name });
  }, [profile, reset]);

  const submit = handleSubmit(async (values) => {
    const avatarUrl = values.avatarUrl?.trim() ?? "";
    try {
      await updateProfile.mutateAsync({
        avatar_url: avatarUrl.length > 0 ? avatarUrl : null,
        full_name: values.fullName.trim(),
      });
      onSuccess("Profil mis à jour.");
    } catch {
      // React Query exposes the backend error through the form state.
    }
  });

  return (
    <SettingsSectionCard
      description="Gérez votre identité visible dans TaskMiner. Votre e-mail reste immuable."
      title="Profil public"
    >
      <div className="grid gap-8 xl:grid-cols-[14rem_1fr]">
        <div className="flex flex-col items-center gap-3 text-center">
          {profile.avatar_url ? (
            <img
              alt={`Avatar de ${profile.full_name}`}
              className="size-28 rounded-full border object-cover shadow-sm"
              src={profile.avatar_url}
            />
          ) : (
            <div className="bg-primary text-primary-foreground flex size-28 items-center justify-center rounded-full text-3xl font-bold shadow-sm">
              {initials}
            </div>
          )}
          <Badge variant="secondary">
            <ShieldCheck aria-hidden="true" className="mr-1 size-3" />
            {profile.primary_role ?? "Utilisateur"}
          </Badge>
          <p className="text-muted-foreground text-xs">
            L’upload direct sera activé lorsque le stockage d’avatars sera
            disponible. Une URL sécurisée peut déjà être utilisée.
          </p>
        </div>

        <form className="space-y-5" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">
              Nom complet
              <Input autoComplete="name" {...register("fullName")} />
              {errors.fullName ? (
                <span className="text-destructive block text-xs">
                  {errors.fullName.message}
                </span>
              ) : null}
            </label>
            <label className="space-y-2 text-sm font-medium">
              E-mail
              <Input disabled value={profile.email} />
              <span className="text-muted-foreground block text-xs">
                L’adresse e-mail ne peut pas être modifiée.
              </span>
            </label>
          </div>
          <label className="space-y-2 text-sm font-medium">
            <span className="flex items-center gap-2">
              <Camera aria-hidden="true" className="size-4" /> URL de l’avatar
            </span>
            <Input
              inputMode="url"
              placeholder="https://example.com/avatar.jpg"
              {...register("avatarUrl")}
            />
            {errors.avatarUrl ? (
              <span className="text-destructive block text-xs">
                {errors.avatarUrl.message}
              </span>
            ) : null}
          </label>
          <dl className="bg-muted/50 grid gap-3 rounded-lg p-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Compte créé</dt>
              <dd className="font-medium">
                {formatDateTime(profile.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dernier accès</dt>
              <dd className="font-medium">
                {formatDateTime(profile.last_login_at)}
              </dd>
            </div>
          </dl>
          <FormError error={updateProfile.error} />
          <Button disabled={updateProfile.isPending} type="submit">
            {updateProfile.isPending ? (
              <Spinner label="Enregistrement" />
            ) : null}
            Enregistrer le profil
          </Button>
        </form>
      </div>
    </SettingsSectionCard>
  );
}
