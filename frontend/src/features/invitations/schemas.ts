import { z } from "zod";

export const invitationFormSchema = z.object({
  email: z
    .email("Saisissez une adresse email valide.")
    .trim()
    .max(320, "L’adresse email est trop longue."),
  role: z.enum(["admin", "member", "viewer"], {
    error: "Sélectionnez un rôle valide.",
  }),
});

export type InvitationFormValues = z.infer<typeof invitationFormSchema>;
