import { FileSearch, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { ApiError } from "@/api/client";
import { AuditDetailDialog } from "@/components/audit/audit-detail-dialog";
import { AuditFilters } from "@/components/audit/audit-filters";
import { AuditLiveBadge } from "@/components/audit/audit-live-badge";
import { AuditTimeline } from "@/components/audit/audit-timeline";
import { AuditTimelineSkeleton } from "@/components/audit/audit-timeline-skeleton";
import { EmptyState } from "@/components/empty-state";
import { EmptyStateLink } from "@/components/empty-state-link";
import { EntityPageHeader } from "@/components/entity-page-header";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { WorkspaceSelector } from "@/components/workspace-selector";
import {
  useAuditStream,
  useInfiniteWorkspaceAudit,
} from "@/features/audit/hooks";
import {
  type AuditFiltersValue,
  emptyAuditFilters,
} from "@/features/audit/filters";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSessionState } from "@/hooks/use-session-state";
import type {
  AuditActor,
  AuditFilters as Filters,
  AuditLog,
} from "@/types/audit";

function AuditPermissionState() {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-6 text-center">
      <ShieldAlert aria-hidden="true" className="size-8 text-amber-700" />
      <p className="mt-3 font-medium">Accès à l’audit restreint</p>
      <p className="mt-1 max-w-lg text-sm text-amber-900/80">
        Le journal d’audit est réservé aux propriétaires et administrateurs de
        ce workspace.
      </p>
    </div>
  );
}

function AuditNotFoundState() {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center rounded-xl border px-6 text-center">
      <FileSearch aria-hidden="true" className="text-muted-foreground size-8" />
      <p className="mt-3 font-medium">Workspace introuvable</p>
      <p className="text-muted-foreground mt-1 text-sm">
        Ce workspace n’existe plus ou ne vous est pas accessible.
      </p>
    </div>
  );
}

export function AuditPage() {
  const workspace = useActiveWorkspace();
  const [filterState, setFilterState] = useSessionState<AuditFiltersValue>(
    "taskminer-audit-filters",
    emptyAuditFilters,
  );
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const debouncedSearch = useDebouncedValue(filterState.search.trim(), 300);
  const filters = useMemo<Filters>(
    () => ({
      ...(filterState.actorId ? { actor_id: filterState.actorId } : {}),
      ...(filterState.eventType ? { event_type: filterState.eventType } : {}),
      ...(filterState.resourceType
        ? { resource_type: filterState.resourceType }
        : {}),
      ...(filterState.period ? { period: filterState.period } : {}),
      ...(filterState.success
        ? { success: filterState.success === "true" }
        : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }),
    [
      debouncedSearch,
      filterState.actorId,
      filterState.eventType,
      filterState.period,
      filterState.resourceType,
      filterState.success,
    ],
  );
  const auditQuery = useInfiniteWorkspaceAudit(
    workspace.activeWorkspaceId,
    filters,
  );
  const logs = useMemo(() => {
    const seen = new Set<string>();
    return (auditQuery.data?.pages ?? []).flatMap((page) =>
      page.items.filter((auditLog) => {
        if (seen.has(auditLog.id)) {
          return false;
        }
        seen.add(auditLog.id);
        return true;
      }),
    );
  }, [auditQuery.data?.pages]);
  const actors = useMemo(() => {
    const byId = new Map<string, AuditActor>();
    logs.forEach(({ actor }) => {
      if (actor) {
        byId.set(actor.id, actor);
      }
    });
    return [...byId.values()].sort((left, right) =>
      left.full_name.localeCompare(right.full_name, "fr"),
    );
  }, [logs]);
  const stream = useAuditStream({
    filters,
    historyReady: !auditQuery.isPending && !auditQuery.isError,
    latestKnownId: logs[0]?.id ?? null,
    workspaceId: workspace.activeWorkspaceId,
  });
  const total = auditQuery.data?.pages[0]?.count ?? 0;
  const isForbidden =
    auditQuery.error instanceof ApiError && auditQuery.error.status === 403;
  const isNotFound =
    auditQuery.error instanceof ApiError && auditQuery.error.status === 404;

  return (
    <div className="min-w-0 space-y-6">
      <EntityPageHeader
        actions={
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
            <AuditLiveBadge status={stream.status} />
            <WorkspaceSelector
              disabled={workspace.isPending}
              onValueChange={(workspaceId) => {
                workspace.selectWorkspace(workspaceId);
                setFilterState(emptyAuditFilters);
                setSelectedLog(null);
              }}
              value={workspace.activeWorkspaceId}
              workspaces={workspace.workspaces}
            />
          </div>
        }
        description="Consultez en direct la trace immuable des opérations sensibles."
        title="Audit"
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
            action={
              <EmptyStateLink to="/app/workspace">
                Créer un workspace
              </EmptyStateLink>
            }
            description="Créez un workspace pour commencer à alimenter le journal d’audit."
            icon={FileSearch}
            title="Aucun workspace"
          />
        </div>
      ) : null}

      {workspace.activeWorkspaceId && !workspace.isError ? (
        <>
          <AuditFilters
            actors={actors}
            onChange={setFilterState}
            value={filterState}
          />

          {isForbidden ? (
            <AuditPermissionState />
          ) : isNotFound ? (
            <AuditNotFoundState />
          ) : auditQuery.isError ? (
            <ErrorState
              error={auditQuery.error}
              onRetry={() => void auditQuery.refetch()}
            />
          ) : auditQuery.isPending ? (
            <AuditTimelineSkeleton />
          ) : (
            <>
              <p className="text-muted-foreground text-sm" aria-live="polite">
                {total} entrée{total > 1 ? "s" : ""}
              </p>
              <AuditTimeline
                emptyAction={
                  Object.values(filterState).some(Boolean) ? (
                    <Button
                      onClick={() => {
                        setFilterState(emptyAuditFilters);
                      }}
                      type="button"
                      variant="outline"
                    >
                      Effacer les filtres
                    </Button>
                  ) : (
                    <EmptyStateLink to="/app/projects">
                      Voir les projets
                    </EmptyStateLink>
                  )
                }
                hasNextPage={auditQuery.hasNextPage}
                isFetchingNextPage={auditQuery.isFetchingNextPage}
                items={logs}
                latestAuditId={stream.latestAuditId}
                onEndReached={() => {
                  void auditQuery.fetchNextPage();
                }}
                onView={setSelectedLog}
              />
              {stream.latestAuditId ? (
                <p aria-live="polite" className="sr-only">
                  Nouvelle entrée d’audit reçue en temps réel.
                </p>
              ) : null}
            </>
          )}
        </>
      ) : null}

      <AuditDetailDialog
        log={selectedLog}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLog(null);
          }
        }}
        open={selectedLog !== null}
      />
    </div>
  );
}
