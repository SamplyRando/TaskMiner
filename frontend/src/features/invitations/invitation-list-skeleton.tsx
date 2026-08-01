import { Skeleton } from "@/components/ui/skeleton";

export function InvitationListSkeleton() {
  return (
    <div
      aria-label="Chargement des invitations"
      className="space-y-3"
      role="status"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <div
          className="rounded-xl border bg-white p-4"
          key={`invitation-skeleton-${String(index)}`}
        >
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="mt-4 h-4 w-56" />
          <Skeleton className="mt-3 h-4 w-36" />
        </div>
      ))}
    </div>
  );
}
