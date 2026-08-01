import { Skeleton } from "@/components/ui/skeleton";
import { TASK_STATUSES } from "@/types/task";

export function TaskKanbanSkeleton() {
  return (
    <div
      aria-label="Chargement du Kanban"
      className="flex gap-4 overflow-hidden"
      role="status"
    >
      {TASK_STATUSES.map((status) => (
        <div
          className="bg-muted/45 min-h-[32rem] w-80 min-w-80 rounded-2xl border p-3"
          key={status}
        >
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="size-6 rounded-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
          </div>
        </div>
      ))}
      <span className="sr-only">Chargement des tâches…</span>
    </div>
  );
}
