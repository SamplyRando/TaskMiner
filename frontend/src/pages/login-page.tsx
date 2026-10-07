import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

import { requestEmailVerification } from "@/api/auth";
import { ApiError } from "@/api/client";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import type { LoginValues } from "@/features/auth/schemas";
import {
  authStateWithDestination,
  clearRememberedAuthDestination,
  getRememberedAuthDestination,
  getSafeAuthDestination,
  rememberAuthDestination,
  type AuthLocationState,
} from "@/features/auth/redirect";
import { useAuthStore } from "@/store/auth-store";
import { useDocumentTitle } from "@/hooks/use-document-title";

export function LoginPage() {
  useDocumentTitle("Connexion");
  const error = useAuthStore((state) => state.error);
  const isLoading = useAuthStore((state) => state.isLoading);
  const login = useAuthStore((state) => state.login);
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as AuthLocationState | null;
  const destination = state?.from ?? getRememberedAuthDestination();
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendError, setResendError] = useState<unknown>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const handleLogin = async (values: LoginValues): Promise<void> => {
    setUnverifiedEmail(null);
    setResendError(null);
    setResendMessage(null);
    if (destination) rememberAuthDestination(destination);
    try {
      await login(values);
      const target = getSafeAuthDestination(destination);
      clearRememberedAuthDestination();
      void navigate(target, { replace: true });
    } catch (loginError) {
      if (isEmailNotVerifiedError(loginError)) {
        setUnverifiedEmail(values.email.trim().toLowerCase());
      }
      return;
    }
  };

  const resendVerification = async (): Promise<void> => {
    if (!unverifiedEmail || isResending) return;
    setIsResending(true);
    setResendError(null);
    try {
      const result = await requestEmailVerification(unverifiedEmail);
      setResendMessage(result.message);
    } catch (requestError) {
      setResendError(requestError);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthShell
      description="Retrouvez votre espace de travail TaskMiner."
      title="Connexion"
    >
      {state?.registrationSuccess ? (
        <div
          className="border-success-border bg-success-subtle text-success rounded-md border px-3 py-2 text-sm"
          role="status"
        >
          Votre compte a été créé. Vous pouvez maintenant vous connecter.
        </div>
      ) : null}
      <LoginForm
        isLoading={isLoading}
        onSubmit={handleLogin}
        serverError={unverifiedEmail ? null : error}
      />
      {unverifiedEmail ? (
        <div className="border-warning-border bg-warning-subtle space-y-3 rounded-md border p-4">
          <div className="space-y-1" role="alert">
            <p className="font-medium">Adresse e-mail non vérifiée</p>
            <p className="text-muted-foreground text-sm">
              Vérifiez votre adresse avant de vous connecter à TaskMiner.
            </p>
          </div>
          {resendMessage ? (
            <p className="text-success text-sm font-medium" role="status">
              {resendMessage}
            </p>
          ) : (
            <Button
              className="w-full"
              disabled={isResending}
              onClick={() => void resendVerification()}
              type="button"
              variant="outline"
            >
              {isResending ? <Spinner /> : null}
              Renvoyer l’e-mail de vérification
            </Button>
          )}
          <FormError
            error={resendError}
            message={
              resendError instanceof ApiError && resendError.status === 429
                ? "Trop de demandes. Patientez avant de renvoyer l’e-mail."
                : undefined
            }
          />
        </div>
      ) : null}
      <p className="text-center text-sm">
        <Link
          className="text-primary font-medium hover:underline"
          to="/forgot-password"
        >
          Mot de passe oublié ?
        </Link>
      </p>
      <p className="text-muted-foreground text-center text-sm">
        Pas encore de compte ?{" "}
        <Link
          className="text-primary font-medium hover:underline"
          state={authStateWithDestination(destination)}
          to="/register"
        >
          S’inscrire
        </Link>
      </p>
    </AuthShell>
  );
}

const isEmailNotVerifiedError = (error: unknown): boolean => {
  if (!(error instanceof ApiError) || typeof error.details !== "object") {
    return false;
  }
  const payload = error.details as { detail?: unknown };
  if (typeof payload.detail !== "object" || payload.detail === null) {
    return false;
  }
  return (payload.detail as { code?: unknown }).code === "email_not_verified";
};
