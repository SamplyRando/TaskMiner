import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FormField } from "@/features/auth/components/form-field";
import { registerSchema, type RegisterValues } from "@/features/auth/schemas";

type RegisterFormProps = {
  isLoading?: boolean;
  onSubmit?: (values: RegisterValues) => Promise<void> | void;
  serverError?: string | null;
};

export function RegisterForm({
  isLoading = false,
  onSubmit = () => undefined,
  serverError = null,
}: RegisterFormProps) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<RegisterValues>({
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
    resolver: zodResolver(registerSchema),
  });

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit(onSubmit)}>
      <FormField
        autoComplete="name"
        error={errors.fullName?.message}
        id="register-name"
        label="Nom complet"
        type="text"
        {...register("fullName")}
      />
      <FormField
        autoComplete="email"
        error={errors.email?.message}
        id="register-email"
        label="Adresse e-mail"
        type="email"
        {...register("email")}
      />
      <FormField
        autoComplete="new-password"
        error={errors.password?.message}
        id="register-password"
        label="Mot de passe"
        type="password"
        {...register("password")}
      />
      <FormField
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        id="register-password-confirmation"
        label="Confirmer le mot de passe"
        type="password"
        {...register("confirmPassword")}
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
        Créer mon compte
      </Button>
    </form>
  );
}
