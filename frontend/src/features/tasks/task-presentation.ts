import { toneBadgeClasses, type Tone } from "@/lib/tones";
import type { ProjectTaskStatus } from "@/types/project";
import type { Task, TaskPriority, TaskStatus } from "@/types/task";

export const taskStatusLabels: Record<string, string> = {
  done: "Terminée",
  in_progress: "En cours",
  todo: "À faire",
};

export const taskPriorityLabels: Record<TaskPriority, string> = {
  high: "Haute",
  low: "Basse",
  medium: "Moyenne",
  urgent: "Urgente",
};

export const taskPriorityTones: Record<TaskPriority, Tone> = {
  high: "warning",
  low: "neutral",
  medium: "info",
  urgent: "danger",
};

export const taskStatusTones: Record<string, Tone> = {
  done: "success",
  in_progress: "info",
  todo: "neutral",
};

export const taskPriorityClasses: Record<TaskPriority, string> = {
  high: toneBadgeClasses[taskPriorityTones.high],
  low: toneBadgeClasses[taskPriorityTones.low],
  medium: toneBadgeClasses[taskPriorityTones.medium],
  urgent: toneBadgeClasses[taskPriorityTones.urgent],
};

export const taskStatusClasses: Record<string, string> = Object.fromEntries(
  Object.entries(taskStatusTones).map(([status, tone]) => [
    status,
    toneBadgeClasses[tone],
  ]),
);

export const getTaskStatusLabel = (
  status: TaskStatus,
  definitions?: ProjectTaskStatus[],
): string =>
  definitions?.find((item) => item.key === status)?.label ??
  taskStatusLabels[status] ??
  status;

export const getTaskStatusTone = (
  status: TaskStatus,
  completed = false,
): Tone => taskStatusTones[status] ?? (completed ? "success" : "neutral");

export const getTaskStatusClass = (
  status: TaskStatus,
  completed = false,
): string => toneBadgeClasses[getTaskStatusTone(status, completed)];

// Same definition as the dashboard "overdue" metric: unfinished task whose
// due date is in the past. Presentation only.
export const isTaskOverdue = (
  task: Pick<Task, "due_date" | "status" | "status_is_completed">,
  now = Date.now(),
): boolean =>
  task.due_date !== null &&
  new Date(task.due_date).getTime() < now &&
  !(task.status_is_completed ?? task.status === "done");

export const getTaskStatusLabelFromTask = (task: Task): string =>
  task.status_label ?? getTaskStatusLabel(task.status);
