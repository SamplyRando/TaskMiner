import { Radio } from "lucide-react";
import { useMemo, useState } from "react";

import { ActivityFilters } from "@/components/activity/activity-filters";
import type { ActivityFiltersValue } from "@/components/activity/activity-filters";
import { ActivityLiveBadge } from "@/components/activity/activity-live-badge";
import { ActivityTimelineSkeleton } from "@/components/activity/activity-timeline-skeleton";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { EmptyState } from "@/components/empty-state";
import { EntityPageHeader } from "@/components/entity-page-header";
import { ErrorState } from "@/components/error-state";
import { WorkspaceSelector } from "@/components/workspace-selector";
import {
  useActivityStream,
  useInfiniteWorkspaceActivities,
} from "@/features/activities/hooks";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type {
  ActivityActor,
  ActivityFilters as Filters,
} from "@/types/activity";

const emptyFilters: ActivityFiltersValue = {
  actorId: "",
  eventType: "",
  period: "",
  search: "",
};

export function ActivityPage() {
  const workspace = useActiveWorkspace();
  const [filterState, setFilterState] =
    useState<ActivityFiltersValue>(emptyFilters);
  const debouncedSearch = useDebouncedValue(filterState.search.trim(), 300);
  const filters = useMemo<Filters>(
    () => ({
      ...(filterState.actorId ? { actor_id: filterState.actorId } : {}),
      ...(filterState.eventType ? { event_type: filterState.eventType } : {}),
      ...(filterState.period ? { period: filterState.period } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }),
    [
      debouncedSearch,
      filterState.actorId,
      filterState.eventType,
      filterState.period,
    ],
  );
  const activitiesQuery = useInfiniteWorkspaceActivities(
    workspace.activeWorkspaceId,
    filters,
  );
  const activities = useMemo(() => {
    const seen = new Set<string>();
    return (activitiesQuery.data?.pages ?? []).flatMap((page) =>
      page.items.filter((activity) => {
        if (seen.has(activity.id)) {
          return false;
        }
        seen.add(activity.id);
        return true;
      }),
    );
  }, [activitiesQuery.data?.pages]);
  const actors = useMemo(() => {
    const byId = new Map<string, ActivityActor>();
    activities.forEach(({ actor }) => {
      if (actor) {
        byId.set(actor.id, actor);
      }
    });
    return [...byId.values()].sort((left, right) =>
      left.full_name.localeCompare(right.full_name, "fr"),
    );
  }, [activities]);
  const stream = useActivityStream({
    filters,
    workspaceId: workspace.activeWorkspaceId,
    workspaceName: workspace.activeWorkspace?.name ?? "",
  });
  const total = activitiesQuery.data?.pages[0]?.count ?? 0;

  return (
    <div className="min-w-0 space-y-6">
      <EntityPageHeader
        actions={
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
            <ActivityLiveBadge status={stream.status} />
            <WorkspaceSelector
              disabled={workspace.isPending}
              onValueChange={(workspaceId) => {
                workspace.selectWorkspace(workspaceId);
                setFilterState(emptyFilters);
              }}
              value={workspace.activeWorkspaceId}
              workspaces={workspace.workspaces}
            />
          </div>
        }
        description="Suivez en direct les événements de votre espace de travail."
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
          <ActivityFilters
            actors={actors}
            onChange={setFilterState}
            value={filterState}
          />

          {activitiesQuery.isError ? (
            <ErrorState
              error={activitiesQuery.error}
              onRetry={() => void activitiesQuery.refetch()}
            />
          ) : activitiesQuery.isPending ? (
            <ActivityTimelineSkeleton />
          ) : (
            <>
              <p className="text-muted-foreground text-sm" aria-live="polite">
                {total} activité{total > 1 ? "s" : ""}
              </p>
              <ActivityTimeline
                hasNextPage={activitiesQuery.hasNextPage}
                isFetchingNextPage={activitiesQuery.isFetchingNextPage}
                items={activities}
                latestActivityId={stream.latestActivityId}
                onEndReached={() => {
                  void activitiesQuery.fetchNextPage();
                }}
              />
              {stream.latestActivityId ? (
                <p aria-live="polite" className="sr-only">
                  Nouvelle activité reçue en temps réel.
                </p>
              ) : null}
            </>
          )}
        </>
      ) : null}
    </div>
  );
}
