import { Link, useLocation, useNavigate } from "react-router-dom";

import { BrandLogo } from "@/components/brand-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "@/features/auth/components/register-form";
import type { RegisterValues } from "@/features/auth/schemas";
import {
  authStateWithDestination,
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
      void navigate("/login", {
        replace: true,
        state: authStateWithDestination(state?.from, true),
      });
    } catch {
      return;
    }
  };

  return (
    <main className="from-background via-muted/40 to-primary/5 flex min-h-screen items-center justify-center bg-linear-to-br px-4 py-12">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-3 flex justify-center">
            <BrandLogo to="/register" />
          </div>
          <CardTitle>Créer un compte</CardTitle>
          <CardDescription>
            Préparez votre premier espace de travail.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RegisterForm
            isLoading={isLoading}
            onSubmit={handleRegister}
            serverError={error}
          />
          <p className="text-muted-foreground text-center text-xs leading-5">
            En créant un compte, vous reconnaissez avoir pris connaissance de
            notre{" "}
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
        </CardContent>
      </Card>
    </main>
  );
}
