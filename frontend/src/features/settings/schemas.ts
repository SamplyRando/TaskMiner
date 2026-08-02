import { z } from "zod";

const namePattern = /^[\p{L} .'-]+$/u;

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(255, "Le nom ne peut pas dépasser 255 caractères.")
    .regex(namePattern, "Le nom contient des caractères non autorisés."),
  avatarUrl: z
    .union([z.url("Saisissez une URL d’image valide."), z.literal("")])
    .optional(),
});

const strongPassword = z
  .string()
  .min(12, "Utilisez au moins 12 caractères.")
  .max(128, "Le mot de passe ne peut pas dépasser 128 caractères.")
  .regex(/[a-z]/, "Ajoutez une minuscule.")
  .regex(/[A-Z]/, "Ajoutez une majuscule.")
  .regex(/\d/, "Ajoutez un chiffre.")
  .regex(/[^A-Za-z0-9]/, "Ajoutez un caractère spécial.");

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Le mot de passe actuel est requis."),
    newPassword: strongPassword,
    confirmation: z.string().min(1, "Confirmez le nouveau mot de passe."),
  })
  .refine(({ confirmation, newPassword }) => confirmation === newPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmation"],
  });

export const dangerSchema = z.object({
  confirmation: z
    .string()
    .refine(
      (value) => ["DELETE", "SUPPRIMER"].includes(value),
      "Saisissez DELETE ou SUPPRIMER.",
    ),
  currentPassword: z.string().min(1, "Le mot de passe actuel est requis."),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type PasswordFormValues = z.infer<typeof passwordSchema>;
export type DangerFormValues = z.infer<typeof dangerSchema>;
