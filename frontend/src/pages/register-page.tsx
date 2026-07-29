import { Link, useNavigate } from "react-router-dom";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "@/features/auth/components/register-form";
import type { RegisterValues } from "@/features/auth/schemas";
import { useAuthStore } from "@/store/auth-store";

export function RegisterPage() {
  const error = useAuthStore((state) => state.error);
  const isLoading = useAuthStore((state) => state.isLoading);
  const registerAccount = useAuthStore((state) => state.register);
  const navigate = useNavigate();

  const handleRegister = async (values: RegisterValues): Promise<void> => {
    try {
      await registerAccount({
        email: values.email,
        fullName: values.fullName,
        password: values.password,
      });
      void navigate("/login", {
        replace: true,
        state: { registrationSuccess: true },
      });
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
          <p className="text-muted-foreground text-center text-sm">
            Déjà inscrit ?{" "}
            <Link
              className="text-primary font-medium hover:underline"
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
