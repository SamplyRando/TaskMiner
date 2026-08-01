import { ChevronLeft, ChevronRight, Radio } from "lucide-react";
import { useMemo, useState } from "react";

import { ActivityTimelineSkeleton } from "@/components/activity/activity-timeline-skeleton";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { EmptyState } from "@/components/empty-state";
import { EntityPageHeader } from "@/components/entity-page-header";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { WorkspaceSelector } from "@/components/workspace-selector";
import { useWorkspaceActivities } from "@/features/activities/hooks";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";

const PAGE_SIZE = 20;

type WorkspacePagination = {
  pageIndex: number;
  workspaceId: string | null;
};

export function ActivityPage() {
  const workspace = useActiveWorkspace();
  const [pagination, setPagination] = useState<WorkspacePagination>({
    pageIndex: 0,
    workspaceId: null,
  });
  const pageIndex =
    pagination.workspaceId === workspace.activeWorkspaceId
      ? pagination.pageIndex
      : 0;
  const params = useMemo(
    () => ({ limit: PAGE_SIZE, offset: pageIndex * PAGE_SIZE }),
    [pageIndex],
  );
  const activitiesQuery = useWorkspaceActivities(
    workspace.activeWorkspaceId,
    params,
  );
  const total = activitiesQuery.data?.count ?? 0;
  const pageCount = Math.ceil(total / PAGE_SIZE);

  const setPage = (nextPage: number) => {
    setPagination({
      pageIndex: nextPage,
      workspaceId: workspace.activeWorkspaceId,
    });
  };

  return (
    <div className="min-w-0 space-y-6">
      <EntityPageHeader
        actions={
          <WorkspaceSelector
            disabled={workspace.isPending}
            onValueChange={(workspaceId) => {
              workspace.selectWorkspace(workspaceId);
              setPagination({ pageIndex: 0, workspaceId });
            }}
            value={workspace.activeWorkspaceId}
            workspaces={workspace.workspaces}
          />
        }
        description="Suivez les événements récents de votre espace de travail."
        title="Activité"
      />

      {workspace.isError ? (
        <ErrorState
          error={workspace.error}
          onRetry={() => void workspace.refetch()}
        />
      ) : null}

      {!workspace.isPending &&
      !workspace.isError &&
      workspace.workspaces.length === 0 ? (
        <div className="bg-card rounded-xl border">
          <EmptyState
            description="Créez un workspace pour commencer à suivre son activité."
            icon={Radio}
            title="Aucun workspace"
          />
        </div>
      ) : null}

      {workspace.activeWorkspaceId && !workspace.isError ? (
        <>
          {activitiesQuery.isError ? (
            <ErrorState
              error={activitiesQuery.error}
              onRetry={() => void activitiesQuery.refetch()}
            />
          ) : activitiesQuery.isPending ? (
            <ActivityTimelineSkeleton />
          ) : (
            <ActivityTimeline items={activitiesQuery.data.items} />
          )}

          {!activitiesQuery.isError && !activitiesQuery.isPending ? (
            <nav
              aria-label="Pagination des activités"
              className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 sm:flex-row"
            >
              <p className="text-muted-foreground text-sm" aria-live="polite">
                {total} activité{total > 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground min-w-24 text-center text-sm">
                  Page {pageCount === 0 ? 0 : pageIndex + 1} / {pageCount}
                </span>
                <Button
                  aria-label="Page précédente"
                  disabled={pageIndex === 0}
                  onClick={() => {
                    setPage(Math.max(pageIndex - 1, 0));
                  }}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                </Button>
                <Button
                  aria-label="Page suivante"
                  disabled={(pageIndex + 1) * PAGE_SIZE >= total}
                  onClick={() => {
                    setPage(pageIndex + 1);
                  }}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Button>
              </div>
            </nav>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
