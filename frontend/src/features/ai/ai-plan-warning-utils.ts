import type { AIPlanReviewValues } from "@/features/ai/schemas";

export type AIPlanWarningLevel = "blocking" | "info" | "warning";

export type AIPlanWarning = {
  id: string;
  level: AIPlanWarningLevel;
  message: string;
  taskOrder?: number;
};

const normalizeWarning = (message: string) =>
  message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("’", "'")
    .toLowerCase();

const isMissingScheduleWarning = (message: string) => {
  const normalized = normalizeWarning(message);
  return (
    /\b(?:no|without)\s+(?:target|due)\s+date\b/.test(normalized) ||
    /\b(?:aucune|sans|pas de)\s+(?:date cible|echeance)\b/.test(normalized) ||
    /\bdate cible\b.{0,50}\b(?:non fournie|non indiquee|non definie|non precisee|n'a pas ete fournie)\b/.test(
      normalized,
    ) ||
    /\btaches?\b.{0,50}\b(?:n'ont pas|sans)\b.{0,30}\b(?:date|echeance)\b/.test(
      normalized,
    ) ||
    /\btasks?\b.{0,50}\b(?:without|no)\b.{0,30}\b(?:date|due date)\b/.test(
      normalized,
    )
  );
};

const isRecommendationNotice = (message: string) => {
  const normalized = normalizeWarning(message);
  return (
    normalized.startsWith("recommandation proposee") ||
    normalized.startsWith("recommandation :") ||
    normalized.startsWith("recommended approach") ||
    normalized.startsWith("recommendation:")
  );
};

export const buildAIPlanWarnings = (
  providerWarnings: string[],
  tasks: AIPlanReviewValues["tasks"],
): AIPlanWarning[] => {
  const warnings: AIPlanWarning[] = [];
  const firstMissingScheduleWarningIndex = providerWarnings.findIndex(
    isMissingScheduleWarning,
  );
  const hasMissingScheduleWarning = firstMissingScheduleWarningIndex >= 0;
  providerWarnings.forEach((message, index) => {
    const missingSchedule = isMissingScheduleWarning(message);
    if (missingSchedule && index !== firstMissingScheduleWarningIndex) return;
    warnings.push({
      id: `provider-${String(index)}-${message}`,
      level:
        missingSchedule || isRecommendationNotice(message) ? "info" : "warning",
      message,
    });
  });
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
  if (withoutDate > 0 && !hasMissingScheduleWarning) {
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
