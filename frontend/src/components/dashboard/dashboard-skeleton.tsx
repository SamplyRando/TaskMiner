import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div
      aria-label="Chargement du dashboard"
      className="space-y-6"
      role="status"
    >
      <div className="space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-5 w-full max-w-lg" />
      </div>
      <div className="bg-border grid gap-px overflow-hidden rounded-lg border shadow-xs sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <div className="bg-card" key={index}>
            <div className="flex min-h-36 items-center justify-between p-5">
              <div className="space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-16" />
              </div>
              <Skeleton className="size-5 rounded-sm" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 4 }, (_, row) => (
                <Skeleton className="h-9 w-full" key={row} />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
