import { Skeleton } from "@/components/ui/skeleton";

export function ActivityTimelineSkeleton() {
  return (
    <div
      aria-label="Chargement des activités"
      className="mx-auto max-w-4xl space-y-3"
      role="status"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <div className="flex gap-3" key={index}>
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="bg-card flex-1 space-y-2.5 rounded-xl border p-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-52" />
          </div>
        </div>
      ))}
    </div>
  );
}
