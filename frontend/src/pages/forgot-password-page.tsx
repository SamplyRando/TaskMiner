import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";

import { requestPasswordReset } from "@/api/auth";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AccountActionCard } from "@/features/auth/components/account-action-card";
import { FormField } from "@/features/auth/components/form-field";
import {
  accountEmailSchema,
  type AccountEmailValues,
} from "@/features/auth/schemas";
import { useDocumentTitle } from "@/hooks/use-document-title";

export function ForgotPasswordPage() {
  useDocumentTitle("Mot de passe oublié");
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<AccountEmailValues>({
    defaultValues: { email: "" },
    mode: "onChange",
    resolver: zodResolver(accountEmailSchema),
  });

  const submit = async ({ email }: AccountEmailValues): Promise<void> => {
    setError(null);
    try {
      const result = await requestPasswordReset(email);
      setMessage(result.message);
    } catch (requestError) {
      setError(requestError);
    }
  };

  return (
    <AccountActionCard
      description="Recevez un lien à usage unique pour choisir un nouveau mot de passe."
      title="Mot de passe oublié"
    >
      {message ? (
        <div
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
          role="status"
        >
          {message}
        </div>
      ) : (
        <form className="space-y-5" noValidate onSubmit={handleSubmit(submit)}>
          <FormField
            autoComplete="email"
            error={errors.email?.message}
            id="forgot-password-email"
            label="Adresse e-mail"
            type="email"
            {...register("email")}
          />
          <FormError error={error} />
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? <Spinner /> : null}
            Envoyer le lien
          </Button>
        </form>
      )}
      <p className="text-muted-foreground text-center text-sm">
        <Link className="text-primary font-medium hover:underline" to="/login">
          Retour à la connexion
        </Link>
      </p>
    </AccountActionCard>
  );
}
