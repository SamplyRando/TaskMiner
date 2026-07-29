import { Link, useLocation, useNavigate } from "react-router-dom";

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

type LoginLocationState = {
  from?: {
    pathname?: string;
  };
  registrationSuccess?: boolean;
};

export function LoginPage() {
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
    <main className="bg-muted/40 flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="text-primary mb-2 text-sm font-bold tracking-widest uppercase">
            TaskMiner
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
