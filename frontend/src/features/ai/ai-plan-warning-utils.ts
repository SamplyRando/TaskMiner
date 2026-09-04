import type { AIPlanReviewValues } from "@/features/ai/schemas";

export type AIPlanWarningLevel = "blocking" | "info" | "warning";

export type AIPlanWarning = {
  id: string;
  level: AIPlanWarningLevel;
  message: string;
  taskOrder?: number;
};

export const buildAIPlanWarnings = (
  providerWarnings: string[],
  tasks: AIPlanReviewValues["tasks"],
): AIPlanWarning[] => {
  const warnings: AIPlanWarning[] = providerWarnings.map((message, index) => ({
    id: `provider-${String(index)}-${message}`,
    level: "warning",
    message,
  }));
  const tasksByOrder = new Map(tasks.map((task) => [task.sourceOrder, task]));
  const selectedTasks = tasks.filter((task) => task.selected);

  for (const task of selectedTasks) {
    for (const dependencyOrder of task.dependsOn) {
      const dependency = tasksByOrder.get(dependencyOrder);
      if (!dependency || dependencyOrder >= task.sourceOrder) {
        warnings.push({
          id: `invalid-dependency-${String(task.sourceOrder)}-${String(dependencyOrder)}`,
          level: "blocking",
          message: `La dépendance de « ${task.title} » est incohérente. Vérifiez ce brouillon avant de l’appliquer.`,
          taskOrder: task.sourceOrder,
        });
      } else if (!dependency.selected) {
        warnings.push({
          id: `excluded-dependency-${String(task.sourceOrder)}-${String(dependencyOrder)}`,
          level: "warning",
          message: `« ${task.title} » dépend de « ${dependency.title} », désormais désélectionnée. Cette référence sera retirée du brouillon appliqué.`,
          taskOrder: task.sourceOrder,
        });
      }
    }
  }

  const withoutDate = selectedTasks.filter((task) => !task.dueDate).length;
  if (withoutDate > 0) {
    warnings.push({
      id: "tasks-without-date",
      level: "info",
      message: `${String(withoutDate)} tâche${withoutDate > 1 ? "s n’ont" : " n’a"} pas encore de date suggérée.`,
    });
  }
  const withoutAssignee = selectedTasks.filter(
    (task) => !task.assignedUserId,
  ).length;
  if (withoutAssignee > 0) {
    warnings.push({
      id: "tasks-without-assignee",
      level: "info",
      message: `${String(withoutAssignee)} tâche${withoutAssignee > 1 ? "s restent" : " reste"} sans assignation suggérée.`,
    });
  }

  return warnings;
};
