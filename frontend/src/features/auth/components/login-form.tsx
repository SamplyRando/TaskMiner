import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FormField } from "@/features/auth/components/form-field";
import { loginSchema, type LoginValues } from "@/features/auth/schemas";

type LoginFormProps = {
  isLoading?: boolean;
  onSubmit?: (values: LoginValues) => Promise<void> | void;
  serverError?: string | null;
};

export function LoginForm({
  isLoading = false,
  onSubmit = () => undefined,
  serverError = null,
}: LoginFormProps) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginValues>({
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onChange",
    resolver: zodResolver(loginSchema),
  });

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
      <FormField
        autoComplete="email"
        error={errors.email?.message}
        id="login-email"
        label="Adresse e-mail"
        type="email"
        {...register("email")}
      />
      <FormField
        autoComplete="current-password"
        error={errors.password?.message}
        id="login-password"
        label="Mot de passe"
        type="password"
        {...register("password")}
      />
      {serverError ? (
        <div
          className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm"
          role="alert"
        >
          {serverError}
        </div>
      ) : null}
      <Button
        className="w-full"
        disabled={isSubmitting || isLoading}
        type="submit"
      >
        {isSubmitting || isLoading ? <Spinner /> : null}
        Se connecter
      </Button>
    </form>
  );
}
