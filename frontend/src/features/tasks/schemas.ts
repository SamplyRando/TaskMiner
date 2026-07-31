import { z } from "zod";

import { TASK_PRIORITIES, TASK_STATUSES } from "@/types/task";

export const taskFormSchema = z.object({
  description: z
    .string()
    .max(5_000, "La description ne peut pas dépasser 5 000 caractères."),
  dueDate: z.string(),
  priority: z.enum(TASK_PRIORITIES),
  projectId: z.uuid("Sélectionnez un projet valide."),
  status: z.enum(TASK_STATUSES),
  title: z
    .string()
    .trim()
    .min(1, "Le titre est obligatoire.")
    .max(255, "Le titre ne peut pas dépasser 255 caractères."),
});

export const taskAssignmentSchema = z.object({
  assignedUserId: z.union([
    z.literal(""),
    z.uuid("Saisissez un identifiant utilisateur valide."),
  ]),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;
export type TaskAssignmentValues = z.infer<typeof taskAssignmentSchema>;
