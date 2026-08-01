import { taskStatusLabels } from "@/features/tasks/task-presentation";
import { TASK_STATUSES, type Task, type TaskStatus } from "@/types/task";

type StatusChange = (task: Task, status: TaskStatus) => Promise<void>;

export type TaskMove = {
  status: TaskStatus;
  task: Task;
};

export type TaskMoveNotice = {
  kind: "error" | "success";
  message: string;
};

const isTaskStatus = (value: unknown): value is TaskStatus =>
  typeof value === "string" && TASK_STATUSES.some((status) => status === value);

export function resolveTaskMove(
  tasks: Task[],
  activeId: string,
  overData: unknown,
  canManageTasks: boolean,
): TaskMove | null {
  const task = tasks.find((candidate) => candidate.id === activeId);
  const targetStatus =
    typeof overData === "object" && overData !== null && "status" in overData
      ? (overData as Record<string, unknown>).status
      : undefined;

  if (
    !task ||
    !canManageTasks ||
    !isTaskStatus(targetStatus) ||
    targetStatus === task.status
  ) {
    return null;
  }

  return { status: targetStatus, task };
}

export async function performTaskMove(
  move: TaskMove,
  onStatusChange: StatusChange,
): Promise<TaskMoveNotice> {
  try {
    await onStatusChange(move.task, move.status);
    return {
      kind: "success",
      message: `« ${move.task.title} » a été déplacée vers ${taskStatusLabels[move.status]}.`,
    };
  } catch {
    return {
      kind: "error",
      message: `Le déplacement de « ${move.task.title} » a échoué. Les données ont été restaurées.`,
    };
  }
}
