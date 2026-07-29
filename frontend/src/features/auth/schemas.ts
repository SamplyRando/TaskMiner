import { z } from "zod";

const registerPasswordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .max(128, "Le mot de passe ne peut pas dépasser 128 caractères.");

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
    password: registerPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine(({ confirmPassword, password }) => confirmPassword === password, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
