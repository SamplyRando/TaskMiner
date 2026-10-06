import { Skeleton } from "@/components/ui/skeleton";

export function ActivityTimelineSkeleton() {
  return (
    <div
      aria-label="Chargement des activités"
      className="space-y-10"
      role="status"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index}>
          <div className="flex items-center gap-3">
            <Skeleton className="size-7 shrink-0 rounded-md" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="bg-card rounded-card mt-2 ml-10 space-y-2.5 border px-3.5 py-3">
            <Skeleton className="h-5 w-2/3" />
            <div className="flex items-center gap-2">
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
