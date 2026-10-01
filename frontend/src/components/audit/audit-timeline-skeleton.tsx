import { Skeleton } from "@/components/ui/skeleton";

export function AuditTimelineSkeleton() {
  return (
    <div aria-label="Chargement du journal d’audit" className="space-y-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div className="rounded-xl border p-3" key={index}>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="mt-3 h-5 w-2/3" />
          <Skeleton className="mt-2 h-4 w-1/2" />
          <Skeleton className="mt-3 h-9 w-full" />
        </div>
      ))}
    </div>
  );
}
