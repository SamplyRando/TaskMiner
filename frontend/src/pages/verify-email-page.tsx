import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { confirmEmailVerification, requestEmailVerification } from "@/api/auth";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AccountActionCard } from "@/features/auth/components/account-action-card";
import { FormField } from "@/features/auth/components/form-field";
import {
  accountEmailSchema,
  type AccountEmailValues,
} from "@/features/auth/schemas";
import {
  authStateWithDestination,
  getRememberedAuthDestination,
  rememberAuthDestination,
  type AuthLocationState,
} from "@/features/auth/redirect";
import { useDocumentTitle } from "@/hooks/use-document-title";

type VerificationState = "idle" | "verifying" | "verified" | "error";

export function VerifyEmailPage() {
  useDocumentTitle("Vérifier votre adresse e-mail");
  const location = useLocation();
  const navigate = useNavigate();
  const navigationState = location.state as AuthLocationState | null;
  const destination = navigationState?.from ?? getRememberedAuthDestination();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const verifiedToken = useRef<string | null>(null);
  const [verificationState, setVerificationState] = useState<VerificationState>(
    token ? "verifying" : "idle",
  );
  const [verificationError, setVerificationError] = useState<unknown>(null);
  const [resendError, setResendError] = useState<unknown>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<AccountEmailValues>({
    defaultValues: { email: navigationState?.email ?? "" },
    mode: "onChange",
    resolver: zodResolver(accountEmailSchema),
  });

  useEffect(() => {
    if (destination) rememberAuthDestination(destination);
    if (!token || verifiedToken.current === token) return;
    verifiedToken.current = token;
    setVerificationState("verifying");
    setVerificationError(null);
    void confirmEmailVerification(token)
      .then(() => {
        setVerificationState("verified");
        void navigate("/verify-email", {
          replace: true,
          state: authStateWithDestination(destination, true),
        });
      })
      .catch((error: unknown) => {
        setVerificationError(error);
        setVerificationState("error");
        void navigate("/verify-email", {
          replace: true,
          state: authStateWithDestination(destination, true),
        });
      });
  }, [destination, navigate, token]);

  const resend = async ({ email }: AccountEmailValues): Promise<void> => {
    setResendError(null);
    try {
      const result = await requestEmailVerification(email);
      setResendMessage(result.message);
    } catch (error) {
      setResendError(error);
    }
  };

  const loginState = authStateWithDestination(destination, true);

  return (
    <AccountActionCard
      description="Confirmez que cette adresse vous appartient grâce au lien envoyé par TaskMiner."
      title="Vérifier votre adresse e-mail"
    >
      {verificationState === "verifying" ? (
        <div
          aria-live="polite"
          className="text-muted-foreground flex items-center justify-center gap-2 py-4 text-sm"
          role="status"
        >
          <Spinner /> Vérification en cours…
        </div>
      ) : null}

      {verificationState === "verified" ? (
        <div
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800"
          role="status"
        >
          Votre adresse e-mail est vérifiée. Vous pouvez vous connecter.
        </div>
      ) : null}

      {verificationState === "error" ? (
        <FormError error={verificationError} />
      ) : null}

      {verificationState !== "verifying" && verificationState !== "verified" ? (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {navigationState?.registrationSuccess
              ? "Votre compte a été créé. Consultez votre boîte de réception ou demandez un nouveau lien."
              : "Vous n’avez plus le lien ? Demandez un nouvel e-mail de vérification."}
          </p>
          {resendMessage ? (
            <div
              className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
              role="status"
            >
              {resendMessage}
            </div>
          ) : (
            <form
              className="space-y-5"
              noValidate
              onSubmit={handleSubmit(resend)}
            >
              <FormField
                autoComplete="email"
                error={errors.email?.message}
                id="verification-email"
                label="Adresse e-mail"
                type="email"
                {...register("email")}
              />
              <FormError error={resendError} />
              <Button className="w-full" disabled={isSubmitting} type="submit">
                {isSubmitting ? <Spinner /> : null}
                Renvoyer l’e-mail
              </Button>
            </form>
          )}
        </div>
      ) : null}

      <p className="text-muted-foreground text-center text-sm">
        <Link
          className="text-primary font-medium hover:underline"
          state={loginState}
          to="/login"
        >
          Continuer vers la connexion
        </Link>
      </p>
    </AccountActionCard>
  );
}
