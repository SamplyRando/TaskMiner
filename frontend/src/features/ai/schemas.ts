import { z } from "zod";

import { TASK_PRIORITIES, TASK_STATUSES } from "@/types/task";
import type { AIChangeField } from "@/types/ai";

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

export const aiProjectChangeFormSchema = z.object({
  workspaceId: z.string().min(1, "Sélectionnez un workspace."),
  projectId: z.string().min(1, "Sélectionnez un projet."),
  instruction: z
    .string()
    .trim()
    .min(10, "Décrivez la modification en au moins 10 caractères.")
    .max(5_000, "L’instruction ne peut pas dépasser 5 000 caractères."),
});

export type AIProjectChangeFormValues = z.infer<
  typeof aiProjectChangeFormSchema
>;

const aiChangeStateSchema = z.object({
  title: z.string().max(255),
  description: z.string().max(5_000),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: z.string(),
});

const aiTaskChangeReviewSchema = z.object({
  selected: z.boolean(),
  changeId: z.string(),
  taskId: z.string(),
  taskTitle: z.string(),
  reason: z.string(),
  changedFields: z.array(
    z.enum(["title", "description", "status", "priority", "due_date"]),
  ),
  before: aiChangeStateSchema,
  after: aiChangeStateSchema,
});

export const aiProjectChangeReviewDraftSchema = z.object({
  changes: z.array(aiTaskChangeReviewSchema).max(50),
});

const hasActualChange = (
  change: z.infer<typeof aiTaskChangeReviewSchema>,
): boolean =>
  change.changedFields.some((field: AIChangeField) => {
    const key = field === "due_date" ? "dueDate" : field;
    if (field === "due_date") {
      return change.before.dueDate.slice(0, 10) !== change.after.dueDate;
    }
    return change.before[key] !== change.after[key];
  });

export const aiProjectChangeReviewSchema =
  aiProjectChangeReviewDraftSchema.superRefine((values, context) => {
    const selected = values.changes.filter((change) => change.selected);
    if (selected.length === 0) {
      context.addIssue({
        code: "custom",
        message: "Sélectionnez au moins une modification.",
        path: ["changes"],
      });
    }
    values.changes.forEach((change, index) => {
      if (!change.selected) return;
      if (!change.after.title.trim()) {
        context.addIssue({
          code: "custom",
          message: "Le titre est obligatoire.",
          path: ["changes", index, "after", "title"],
        });
      }
      if (!hasActualChange(change)) {
        context.addIssue({
          code: "custom",
          message: "Conservez au moins une différence pour cette tâche.",
          path: ["changes", index, "after"],
        });
      }
    });
  });

export type AIProjectChangeReviewValues = z.infer<
  typeof aiProjectChangeReviewSchema
>;
