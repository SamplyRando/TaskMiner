import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Eye, EyeOff, KeyRound, X } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip } from "@/components/ui/tooltip";
import { useChangePassword } from "@/features/settings/hooks";
import {
  passwordSchema,
  type PasswordFormValues,
} from "@/features/settings/schemas";
import { SettingsSectionCard } from "@/features/settings/settings-section-card";
import { cn } from "@/lib/utils";

type SecurityPanelProps = { onSuccess: (message: string) => void };

const requirementRows = (password: string, confirmation: string) => [
  { label: "12 caractères", valid: password.length >= 12 },
  { label: "Une minuscule", valid: /[a-z]/.test(password) },
  { label: "Une majuscule", valid: /[A-Z]/.test(password) },
  { label: "Un chiffre", valid: /\d/.test(password) },
  { label: "Un caractère spécial", valid: /[^A-Za-z0-9]/.test(password) },
  {
    label: "Confirmation identique",
    valid: confirmation.length > 0 && password === confirmation,
  },
];

export function SecurityPanel({ onSuccess }: SecurityPanelProps) {
  const [visible, setVisible] = useState(false);
  const changePassword = useChangePassword();
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    control,
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { confirmation: "", currentPassword: "", newPassword: "" },
  });
  const password = useWatch({ control, name: "newPassword" });
  const confirmation = useWatch({ control, name: "confirmation" });
  const submit = handleSubmit(async (values) => {
    try {
      await changePassword.mutateAsync({
        confirmation: values.confirmation,
        current_password: values.currentPassword,
        new_password: values.newPassword,
      });
      reset();
      onSuccess(
        "Mot de passe modifié. Les autres sessions ont été invalidées.",
      );
    } catch {
      // React Query exposes the backend error through the form state.
    }
  });

  return (
    <SettingsSectionCard
      description="Renforcez votre compte. Le changement invalide tous les jetons précédents."
      icon={<KeyRound aria-hidden="true" className="text-primary size-5" />}
      title="Mot de passe"
    >
      <form className="max-w-2xl space-y-5" onSubmit={submit}>
        {[
          ["currentPassword", "Mot de passe actuel"],
          ["newPassword", "Nouveau mot de passe"],
          ["confirmation", "Confirmation"],
        ].map(([name, label]) => (
          <label className="block space-y-2 text-sm font-medium" key={name}>
            {label}
            <div className="relative">
              <Input
                autoComplete={
                  name === "currentPassword"
                    ? "current-password"
                    : "new-password"
                }
                className="pr-11"
                type={visible ? "text" : "password"}
                {...register(name as keyof PasswordFormValues)}
              />
              <Tooltip content={visible ? "Masquer" : "Afficher"}>
                <button
                  aria-label={
                    visible
                      ? "Masquer les mots de passe"
                      : "Afficher les mots de passe"
                  }
                  className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded p-1"
                  onClick={() => {
                    setVisible((current) => !current);
                  }}
                  type="button"
                >
                  {visible ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </Tooltip>
            </div>
            {errors[name as keyof PasswordFormValues] ? (
              <span className="text-destructive block text-xs">
                {errors[name as keyof PasswordFormValues]?.message}
              </span>
            ) : null}
          </label>
        ))}
        <ul
          className="grid gap-2 rounded-lg border p-4 text-sm sm:grid-cols-2"
          aria-label="Exigences du mot de passe"
        >
          {requirementRows(password, confirmation).map(({ label, valid }) => {
            const Icon = valid ? Check : X;
            return (
              <li
                className={cn(
                  "flex items-center gap-2",
                  valid ? "text-emerald-700" : "text-muted-foreground",
                )}
                key={label}
              >
                <Icon aria-hidden="true" className="size-4" /> {label}
              </li>
            );
          })}
        </ul>
        <FormError error={changePassword.error} />
        <Button disabled={changePassword.isPending} type="submit">
          {changePassword.isPending ? <Spinner label="Mise à jour" /> : null}
          Changer le mot de passe
        </Button>
      </form>
    </SettingsSectionCard>
  );
}
