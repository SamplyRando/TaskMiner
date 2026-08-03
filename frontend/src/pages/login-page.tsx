import { Link, useLocation, useNavigate } from "react-router-dom";

import { BrandLogo } from "@/components/brand-logo";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";
import type { LoginValues } from "@/features/auth/schemas";
import { useAuthStore } from "@/store/auth-store";
import { useDocumentTitle } from "@/hooks/use-document-title";

type LoginLocationState = {
  from?: {
    pathname?: string;
  };
  registrationSuccess?: boolean;
};

export function LoginPage() {
  useDocumentTitle("Connexion");
  const error = useAuthStore((state) => state.error);
  const isLoading = useAuthStore((state) => state.isLoading);
  const login = useAuthStore((state) => state.login);
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LoginLocationState | null;

  const handleLogin = async (values: LoginValues): Promise<void> => {
    try {
      await login(values);
      const destination = state?.from?.pathname ?? "/app";
      void navigate(destination, { replace: true });
    } catch {
      return;
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
            serverError={error}
          />
          <p className="text-muted-foreground text-center text-sm">
            Pas encore de compte ?{" "}
            <Link
              className="text-primary font-medium hover:underline"
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
