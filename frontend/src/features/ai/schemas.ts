import { z } from "zod";

import { TASK_PRIORITIES, TASK_STATUSES } from "@/types/task";

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

const aiReviewedTaskSchema = z.object({
  selected: z.boolean(),
  sourceOrder: z.number().int().positive(),
  title: z.string(),
  description: z.string(),
  priority: z.enum(TASK_PRIORITIES),
  status: z.enum(TASK_STATUSES),
  dueDate: z.string(),
  milestone: z.string(),
  dependsOn: z.array(z.number().int().positive()),
});

export const aiPlanReviewDraftSchema = z.object({
  createProject: z.boolean(),
  projectName: z.string(),
  projectDescription: z.string(),
  tasks: z.array(aiReviewedTaskSchema).min(1).max(50),
});

export const aiPlanReviewSchema = aiPlanReviewDraftSchema.superRefine(
  (values, context) => {
    if (values.createProject) {
      const projectName = values.projectName.trim();
      if (!projectName) {
        context.addIssue({
          code: "custom",
          message: "Le nom du projet est obligatoire.",
          path: ["projectName"],
        });
      } else if (projectName.length > 255) {
        context.addIssue({
          code: "custom",
          message: "Le nom ne peut pas dépasser 255 caractères.",
          path: ["projectName"],
        });
      }
    }

    const selectedTasks = values.tasks.filter((task) => task.selected);
    if (selectedTasks.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Sélectionnez au moins une tâche.",
        path: ["tasks"],
      });
    }
    values.tasks.forEach((task, index) => {
      if (!task.selected) return;
      const title = task.title.trim();
      if (!title) {
        context.addIssue({
          code: "custom",
          message: "Le titre est obligatoire.",
          path: ["tasks", index, "title"],
        });
      } else if (title.length > 255) {
        context.addIssue({
          code: "custom",
          message: "Le titre ne peut pas dépasser 255 caractères.",
          path: ["tasks", index, "title"],
        });
      }
      if (task.description.length > 5_000) {
        context.addIssue({
          code: "custom",
          message: "La description ne peut pas dépasser 5 000 caractères.",
          path: ["tasks", index, "description"],
        });
      }
      if (task.milestone.length > 255) {
        context.addIssue({
          code: "custom",
          message: "La phase ne peut pas dépasser 255 caractères.",
          path: ["tasks", index, "milestone"],
        });
      }
    });
  },
);

export type AIPlanReviewValues = z.infer<typeof aiPlanReviewSchema>;
