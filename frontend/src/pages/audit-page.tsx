import type { PaginationState, SortingState } from "@tanstack/react-table";
import { FileSearch, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";

import { ApiError } from "@/api/client";
import { AuditDetailDialog } from "@/components/audit/audit-detail-dialog";
import { DataTable } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/empty-state";
import { EntityPageHeader } from "@/components/entity-page-header";
import { ErrorState } from "@/components/error-state";
import { Select } from "@/components/ui/select";
import { WorkspaceSelector } from "@/components/workspace-selector";
import { getAuditColumns } from "@/features/audit/audit-columns";
import { useWorkspaceAudit } from "@/features/audit/hooks";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";
import {
  activityEventLabels,
  activityResourceLabels,
} from "@/lib/activity-presentation";
import type { ActivityEvent, ActivityResource } from "@/types/activity";
import type { AuditLog } from "@/types/audit";

const initialPagination: PaginationState = { pageIndex: 0, pageSize: 20 };
const eventOptions = Object.entries(activityEventLabels) as [
  ActivityEvent,
  string,
][];
const resourceOptions = Object.entries(activityResourceLabels) as [
  ActivityResource,
  string,
][];

type WorkspacePagination = PaginationState & {
  workspaceId: string | null;
};

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

export function AuditPage() {
  const workspace = useActiveWorkspace();
  const [paginationState, setPaginationState] = useState<WorkspacePagination>({
    ...initialPagination,
    workspaceId: null,
  });
  const pagination =
    paginationState.workspaceId === workspace.activeWorkspaceId
      ? paginationState
      : { ...initialPagination, workspaceId: workspace.activeWorkspaceId };
  const [sorting, setSorting] = useState<SortingState>([]);
  const [eventType, setEventType] = useState<ActivityEvent | "">("");
  const [resourceType, setResourceType] = useState<ActivityResource | "">("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const params = useMemo(
    () => ({
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      ...(eventType ? { event_type: eventType } : {}),
      ...(resourceType ? { resource_type: resourceType } : {}),
    }),
    [eventType, pagination.pageIndex, pagination.pageSize, resourceType],
  );
  const auditQuery = useWorkspaceAudit(workspace.activeWorkspaceId, params);
  const columns = useMemo(
    () =>
      getAuditColumns({
        onView: setSelectedLog,
      }),
    [],
  );
  const total = auditQuery.data?.count ?? 0;
  const pageCount = Math.ceil(total / pagination.pageSize);
  const isForbidden =
    auditQuery.error instanceof ApiError && auditQuery.error.status === 403;

  const resetPage = () => {
    setPaginationState((current) => ({
      ...current,
      pageIndex: 0,
      workspaceId: workspace.activeWorkspaceId,
    }));
  };

  return (
    <div className="min-w-0 space-y-6">
      <EntityPageHeader
        actions={
          <WorkspaceSelector
            disabled={workspace.isPending}
            onValueChange={(workspaceId) => {
              workspace.selectWorkspace(workspaceId);
              setPaginationState({
                ...initialPagination,
                workspaceId,
              });
              setSelectedLog(null);
            }}
            value={workspace.activeWorkspaceId}
            workspaces={workspace.workspaces}
          />
        }
        description="Consultez la trace immuable des changements sensibles."
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
            description="Créez un workspace pour commencer à alimenter le journal d’audit."
            icon={FileSearch}
            title="Aucun workspace"
          />
        </div>
      ) : null}

      {workspace.activeWorkspaceId && !workspace.isError ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:max-w-3xl">
            <div>
              <label
                className="text-muted-foreground mb-1.5 block text-sm font-medium"
                htmlFor="audit-event-filter"
              >
                Type d’événement
              </label>
              <Select
                id="audit-event-filter"
                onChange={(event) => {
                  setEventType(event.target.value as ActivityEvent | "");
                  resetPage();
                }}
                value={eventType}
              >
                <option value="">Tous les événements</option>
                {eventOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label
                className="text-muted-foreground mb-1.5 block text-sm font-medium"
                htmlFor="audit-resource-filter"
              >
                Type de ressource
              </label>
              <Select
                id="audit-resource-filter"
                onChange={(event) => {
                  setResourceType(event.target.value as ActivityResource | "");
                  resetPage();
                }}
                value={resourceType}
              >
                <option value="">Toutes les ressources</option>
                {resourceOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {isForbidden ? (
            <AuditPermissionState />
          ) : auditQuery.isError ? (
            <ErrorState
              error={auditQuery.error}
              onRetry={() => void auditQuery.refetch()}
            />
          ) : (
            <DataTable
              columns={columns}
              data={auditQuery.data?.items ?? []}
              emptyDescription="Aucun événement ne correspond aux filtres sélectionnés."
              emptyTitle={
                eventType || resourceType
                  ? "Aucun résultat"
                  : "Journal d’audit vide"
              }
              isLoading={auditQuery.isPending}
              manualPagination
              manualSorting
              onPaginationChange={(updater) => {
                setPaginationState((current) => {
                  const nextPagination =
                    typeof updater === "function" ? updater(current) : updater;
                  return {
                    ...nextPagination,
                    workspaceId: workspace.activeWorkspaceId,
                  };
                });
              }}
              onSortingChange={setSorting}
              pageCount={pageCount}
              pagination={pagination}
              sorting={sorting}
              total={total}
            />
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
