import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { confirmPasswordReset } from "@/api/auth";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AccountActionCard } from "@/features/auth/components/account-action-card";
import { FormField } from "@/features/auth/components/form-field";
import {
  passwordResetSchema,
  type PasswordResetValues,
} from "@/features/auth/schemas";
import { useDocumentTitle } from "@/hooks/use-document-title";

export function ResetPasswordPage() {
  useDocumentTitle("Réinitialiser le mot de passe");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token")?.trim() ?? "";
  const [error, setError] = useState<unknown>(null);
  const [isComplete, setIsComplete] = useState(false);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<PasswordResetValues>({
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onChange",
    resolver: zodResolver(passwordResetSchema),
  });

  const submit = async (values: PasswordResetValues): Promise<void> => {
    if (!token) return;
    setError(null);
    try {
      await confirmPasswordReset({
        token,
        newPassword: values.password,
        confirmation: values.confirmPassword,
      });
      setIsComplete(true);
      void navigate("/reset-password", { replace: true });
    } catch (requestError) {
      setError(requestError);
    }
  };

  return (
    <AccountActionCard
      description="Choisissez un mot de passe fort que vous n’utilisez pas ailleurs."
      title="Nouveau mot de passe"
    >
      {isComplete ? (
        <div
          className="space-y-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800"
          role="status"
        >
          <p>Votre mot de passe a été réinitialisé.</p>
          <Link
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex h-10 w-full items-center justify-center rounded-md px-4 py-2 font-medium shadow-xs"
            to="/login"
          >
            Se connecter
          </Link>
        </div>
      ) : !token ? (
        <div
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
          role="alert"
        >
          Ce lien de réinitialisation est incomplet.
        </div>
      ) : (
        <form className="space-y-5" noValidate onSubmit={handleSubmit(submit)}>
          <FormField
            autoComplete="new-password"
            error={errors.password?.message}
            id="reset-password"
            label="Nouveau mot de passe"
            type="password"
            {...register("password")}
          />
          <FormField
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            id="reset-password-confirmation"
            label="Confirmer le mot de passe"
            type="password"
            {...register("confirmPassword")}
          />
          <FormError error={error} />
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? <Spinner /> : null}
            Réinitialiser le mot de passe
          </Button>
        </form>
      )}
      {!isComplete ? (
        <p className="text-muted-foreground text-center text-sm">
          <Link
            className="text-primary font-medium hover:underline"
            to="/forgot-password"
          >
            Demander un nouveau lien
          </Link>
        </p>
      ) : null}
    </AccountActionCard>
  );
}
