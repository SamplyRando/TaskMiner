import { z } from "zod";

export const workspaceFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Le nom est obligatoire.")
    .max(255, "Le nom ne peut pas dépasser 255 caractères."),
  description: z
    .string()
    .max(5_000, "La description ne peut pas dépasser 5 000 caractères."),
});

export type WorkspaceFormValues = z.infer<typeof workspaceFormSchema>;
