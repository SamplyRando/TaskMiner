import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(12, "Le mot de passe doit contenir au moins 12 caractères.")
  .max(128, "Le mot de passe ne peut pas dépasser 128 caractères.")
  .regex(/[a-z]/, "Ajoutez au moins une lettre minuscule.")
  .regex(/[A-Z]/, "Ajoutez au moins une lettre majuscule.")
  .regex(/[0-9]/, "Ajoutez au moins un chiffre.")
  .regex(/[^A-Za-z0-9]/, "Ajoutez au moins un caractère spécial.");

export const loginSchema = z.object({
  email: z.email("Saisissez une adresse e-mail valide."),
  password: z
    .string()
    .min(1, "Le mot de passe est obligatoire.")
    .max(128, "Le mot de passe ne peut pas dépasser 128 caractères."),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(1, "Le nom est obligatoire.")
      .max(255, "Le nom ne peut pas dépasser 255 caractères."),
    email: z.email("Saisissez une adresse e-mail valide."),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(({ confirmPassword, password }) => confirmPassword === password, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;

export const accountEmailSchema = z.object({
  email: z.email("Saisissez une adresse e-mail valide."),
});

export const passwordResetSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(({ confirmPassword, password }) => confirmPassword === password, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export type AccountEmailValues = z.infer<typeof accountEmailSchema>;
export type PasswordResetValues = z.infer<typeof passwordResetSchema>;
