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

export const taskPriorityClasses: Record<TaskPriority, string> = {
  high: "border-orange-200 bg-orange-50 text-orange-700",
  low: "border-slate-200 bg-slate-50 text-slate-600",
  medium: "border-blue-200 bg-blue-50 text-blue-700",
  urgent: "border-red-200 bg-red-50 text-red-700",
};

export const taskStatusClasses: Record<string, string> = {
  done: "border-emerald-200 bg-emerald-50 text-emerald-700",
  in_progress: "border-amber-200 bg-amber-50 text-amber-700",
  todo: "border-violet-200 bg-violet-50 text-violet-700",
};

export const getTaskStatusLabel = (
  status: TaskStatus,
  definitions?: ProjectTaskStatus[],
): string =>
  definitions?.find((item) => item.key === status)?.label ??
  taskStatusLabels[status] ??
  status;

export const getTaskStatusClass = (
  status: TaskStatus,
  completed = false,
): string =>
  taskStatusClasses[status] ??
  (completed
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-200 bg-slate-50 text-slate-700");

export const getTaskStatusLabelFromTask = (task: Task): string =>
  task.status_label ?? getTaskStatusLabel(task.status);
