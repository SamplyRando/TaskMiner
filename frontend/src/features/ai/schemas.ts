import { z } from "zod";

export const aiProjectPlannerSchema = z.object({
  workspaceId: z.string().min(1, "Sélectionnez un workspace."),
  projectId: z.string(),
  targetDate: z.string(),
  prompt: z
    .string()
    .trim()
    .min(10, "Décrivez votre projet en au moins 10 caractères.")
    .max(5_000, "Le brief ne peut pas dépasser 5 000 caractères."),
});

export type AIProjectPlannerFormValues = z.infer<typeof aiProjectPlannerSchema>;
