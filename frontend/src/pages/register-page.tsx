import { Link, useLocation, useNavigate } from "react-router-dom";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";
import { GoogleAuthButton } from "@/features/auth/components/google-auth-button";
import type { RegisterValues } from "@/features/auth/schemas";
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
import { linkedInInsightTag } from "@/lib/linkedin-insight";
import { metaPixel } from "@/lib/meta-pixel";
import type { GoogleAuthResponse } from "@/types/auth";

export function RegisterPage() {
  useDocumentTitle("Inscription");
  const error = useAuthStore((state) => state.error);
  const isLoading = useAuthStore((state) => state.isLoading);
  const registerAccount = useAuthStore((state) => state.register);
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as AuthLocationState | null;

  const handleRegister = async (values: RegisterValues): Promise<void> => {
    try {
      const user = await registerAccount({
        email: values.email,
        fullName: values.fullName,
        password: values.password,
      });
      // Sent only once the backend has confirmed that the account exists.
      metaPixel.track("CompleteRegistration");
      await linkedInInsightTag.trackRegistrationConversion(user.id).catch(
        () =>
          // Analytics must never prevent the successful registration flow.
          false,
      );
      const destination = rememberAuthDestination(
        state?.from ?? getRememberedAuthDestination(),
      );
      void navigate("/verify-email", {
        replace: true,
        state: {
          ...authStateWithDestination(destination, true),
          email: values.email,
        },
      });
    } catch {
      return;
    }
  };

  const handleGoogleSuccess = async (
    result: GoogleAuthResponse,
  ): Promise<void> => {
    if (result.is_new_user) {
      metaPixel.track("CompleteRegistration");
      await linkedInInsightTag
        .trackRegistrationConversion(result.user.id)
        .catch(() => false);
    }
    const destination = getSafeAuthDestination(
      state?.from ?? getRememberedAuthDestination(),
    );
    clearRememberedAuthDestination();
    void navigate(destination, { replace: true });
  };

  return (
    <AuthShell
      description="Préparez votre premier espace de travail."
      title="Créer un compte"
    >
      <GoogleAuthButton mode="authenticate" onSuccess={handleGoogleSuccess} />
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs uppercase">ou</span>
        <span className="bg-border h-px flex-1" />
      </div>
      <RegisterForm
        isLoading={isLoading}
        onSubmit={handleRegister}
        serverError={error}
      />
      <p className="text-muted-foreground text-center text-xs leading-5">
        En créant un compte, vous reconnaissez avoir pris connaissance de nos{" "}
        <Link
          className="text-primary font-medium underline underline-offset-4"
          to="/terms"
        >
          Conditions d’utilisation
        </Link>{" "}
        et de notre{" "}
        <Link
          className="text-primary font-medium underline underline-offset-4"
          to="/privacy"
        >
          Politique de confidentialité
        </Link>
        .
      </p>
      <p className="text-muted-foreground text-center text-sm">
        Déjà inscrit ?{" "}
        <Link
          className="text-primary font-medium hover:underline"
          state={authStateWithDestination(state?.from)}
          to="/login"
        >
          Se connecter
        </Link>
      </p>
    </AuthShell>
  );
}
