import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

import { requestEmailVerification } from "@/api/auth";
import { ApiError } from "@/api/client";
import { BrandLogo } from "@/components/brand-logo";
import { FormError } from "@/components/form-error";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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
    <main className="from-background via-muted/40 to-primary/5 flex min-h-screen items-center justify-center bg-linear-to-br px-4 py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-3 flex justify-center">
            <BrandLogo to="/login" />
          </div>
          <CardTitle>Connexion</CardTitle>
          <CardDescription>
            Retrouvez votre espace de travail TaskMiner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {state?.registrationSuccess ? (
            <div
              className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
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
            <div className="border-primary/25 bg-primary/5 space-y-3 rounded-lg border p-4">
              <div className="space-y-1" role="alert">
                <p className="font-medium">Adresse e-mail non vérifiée</p>
                <p className="text-muted-foreground text-sm">
                  Vérifiez votre adresse avant de vous connecter à TaskMiner.
                </p>
              </div>
              {resendMessage ? (
                <p className="text-sm text-emerald-700" role="status">
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
        </CardContent>
      </Card>
    </main>
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
