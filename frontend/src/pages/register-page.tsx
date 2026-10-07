import { Link, useLocation, useNavigate } from "react-router-dom";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";
import type { RegisterValues } from "@/features/auth/schemas";
import {
  authStateWithDestination,
  getRememberedAuthDestination,
  rememberAuthDestination,
  type AuthLocationState,
} from "@/features/auth/redirect";
import { useAuthStore } from "@/store/auth-store";
import { useDocumentTitle } from "@/hooks/use-document-title";

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
      await registerAccount({
        email: values.email,
        fullName: values.fullName,
        password: values.password,
      });
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

  return (
    <AuthShell
      description="Préparez votre premier espace de travail."
      title="Créer un compte"
    >
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
