import type { PaginationState, SortingState } from "@tanstack/react-table";
import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { redirectToBillingUrl } from "@/api/billing";
import type { Notice } from "@/components/ui/notice-toast";
import { NoticeToast } from "@/components/ui/notice-toast";
import { DataTable } from "@/components/data-table/data-table";
import { DeleteDialog } from "@/components/delete-dialog";
import { EntityPageHeader } from "@/components/entity-page-header";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserPreferences } from "@/features/settings/hooks";
import { useSessionState } from "@/hooks/use-session-state";
import {
  useBillingCheckout,
  useBillingPortal,
} from "@/features/subscriptions/billing-hooks";
import { useAuthStore } from "@/store/auth-store";
import { useWorkspaceStore } from "@/store/workspace-store";
import { useWorkspaceSubscription } from "@/features/subscriptions/hooks";
import { WorkspacePlanCard } from "@/features/subscriptions/workspace-plan-card";
import { getPlanLimitMessage } from "@/features/subscriptions/errors";
import {
  useCreateWorkspace,
  useDeleteWorkspace,
  useUpdateWorkspace,
  useWorkspaces,
} from "@/features/workspaces/hooks";
import { getWorkspaceDeletionErrorMessage } from "@/features/workspaces/errors";
import { getWorkspaceColumns } from "@/features/workspaces/workspace-columns";
import { WorkspaceFormDialog } from "@/features/workspaces/workspace-form-dialog";
import type { Workspace, WorkspaceInput } from "@/types/workspace";

const initialPagination: PaginationState = { pageIndex: 0, pageSize: 20 };

const getBillingReturnNotice = (): Notice | null => {
  const billingResult = new URLSearchParams(window.location.search).get(
    "billing",
  );
  if (billingResult === "success") {
    return {
      message: "Retour de paiement reçu. Vérification de votre plan en cours.",
      type: "success",
    };
  }
  if (billingResult === "cancelled") {
    return {
      message: "Paiement annulé. Votre plan reste inchangé.",
      type: "info",
    };
  }
  return null;
};

export function WorkspacePage() {
  const currentUserId = useAuthStore((state) => state.currentUser?.id ?? "");
  const activeWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspaceId,
  );
  const preferences = useUserPreferences();
  const pageSizeApplied = useRef(false);
  const billingActionLocked = useRef(false);
  const [billingNotice, setBillingNotice] = useState<Notice | null>(
    getBillingReturnNotice,
  );
  const [billingRedirectError, setBillingRedirectError] = useState<unknown>();
  const [search, setSearch] = useSessionState(
    "taskminer-workspaces-search",
    "",
  );
  const [pagination, setPagination] = useSessionState(
    "taskminer-workspaces-pagination",
    initialPagination,
  );
  const [sorting, setSorting] = useSessionState<SortingState>(
    "taskminer-workspaces-sorting",
    [],
  );
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(
    null,
  );

  useEffect(() => {
    if (!preferences.data || pageSizeApplied.current) return;
    pageSizeApplied.current = true;
    setPagination((current) =>
      current.pageSize === preferences.data.items_per_page
        ? current
        : { pageIndex: 0, pageSize: preferences.data.items_per_page },
    );
  }, [preferences.data, setPagination]);

  const workspacesQuery = useWorkspaces();
  const activeWorkspace =
    workspacesQuery.data?.find(({ id }) => id === activeWorkspaceId) ??
    workspacesQuery.data?.[0] ??
    null;
  const subscriptionQuery = useWorkspaceSubscription(
    activeWorkspace?.id ?? null,
  );
  const refetchSubscription = subscriptionQuery.refetch;
  const checkout = useBillingCheckout();
  const portal = useBillingPortal();
  const createWorkspace = useCreateWorkspace();
  const updateWorkspace = useUpdateWorkspace();
  const deleteWorkspace = useDeleteWorkspace();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const billingResult = searchParams.get("billing");
    if (billingResult !== "success" && billingResult !== "cancelled") return;

    if (billingResult === "success") {
      void refetchSubscription();
    }
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("billing");
    const query = nextParams.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
  }, [refetchSubscription]);

  const filteredWorkspaces = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("fr");
    if (!normalizedSearch) {
      return workspacesQuery.data ?? [];
    }

    return (workspacesQuery.data ?? []).filter(
      (workspace) =>
        workspace.name.toLocaleLowerCase("fr").includes(normalizedSearch) ||
        workspace.description
          ?.toLocaleLowerCase("fr")
          .includes(normalizedSearch),
    );
  }, [search, workspacesQuery.data]);

  const columns = useMemo(
    () =>
      getWorkspaceColumns({
        currentUserId,
        onDelete: (workspace) => {
          deleteWorkspace.reset();
          setSelectedWorkspace(workspace);
          setDeleteOpen(true);
        },
        onEdit: (workspace) => {
          updateWorkspace.reset();
          setSelectedWorkspace(workspace);
          setFormOpen(true);
        },
      }),
    [currentUserId, deleteWorkspace, updateWorkspace],
  );

  const handleSubmit = async (data: WorkspaceInput) => {
    try {
      if (selectedWorkspace) {
        await updateWorkspace.mutateAsync({
          data,
          workspaceId: selectedWorkspace.id,
        });
      } else {
        await createWorkspace.mutateAsync(data);
      }
      setFormOpen(false);
    } catch {
      // L'erreur de mutation reste affichée dans la boîte de dialogue.
    }
  };

  const handleDelete = async () => {
    if (!selectedWorkspace) {
      return;
    }

    try {
      await deleteWorkspace.mutateAsync(selectedWorkspace.id);
      setDeleteOpen(false);
      setSelectedWorkspace(null);
    } catch {
      // L'erreur de mutation reste affichée dans la boîte de dialogue.
    }
  };

  const handleBillingAction = async (kind: "checkout" | "portal") => {
    if (!activeWorkspace || billingActionLocked.current) return;
    billingActionLocked.current = true;
    setBillingRedirectError(undefined);
    checkout.reset();
    portal.reset();
    try {
      if (kind === "checkout") {
        const redirect = await checkout.mutateAsync(activeWorkspace.id);
        redirectToBillingUrl(redirect.checkout_url);
      } else {
        const redirect = await portal.mutateAsync(activeWorkspace.id);
        redirectToBillingUrl(redirect.portal_url);
      }
    } catch (error) {
      setBillingRedirectError(error);
    } finally {
      billingActionLocked.current = false;
    }
  };

  return (
    <div className="space-y-6">
      <EntityPageHeader
        actions={
          <Button
            onClick={() => {
              createWorkspace.reset();
              setSelectedWorkspace(null);
              setFormOpen(true);
            }}
            type="button"
          >
            <Plus aria-hidden="true" className="size-4" />
            Nouveau workspace
          </Button>
        }
        description="Organisez vos projets au sein de vos espaces de travail."
        title="Workspaces"
      />

      <div className="relative max-w-md">
        <Search
          aria-hidden="true"
          className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <Input
          aria-label="Rechercher un workspace"
          className="pl-9"
          onChange={(event) => {
            setSearch(event.target.value);
            setPagination((current) => ({ ...current, pageIndex: 0 }));
          }}
          placeholder="Rechercher un workspace…"
          value={search}
        />
      </div>

      {activeWorkspace ? (
        <WorkspacePlanCard
          actionError={
            billingRedirectError ?? checkout.error ?? portal.error ?? null
          }
          actionPending={checkout.isPending || portal.isPending}
          canManageBilling={activeWorkspace.owner_id === currentUserId}
          data={subscriptionQuery.data}
          error={subscriptionQuery.error}
          isPending={subscriptionQuery.isPending}
          onManageBilling={() => {
            void handleBillingAction("portal");
          }}
          onRetry={() => void subscriptionQuery.refetch()}
          onUpgrade={() => {
            void handleBillingAction("checkout");
          }}
          workspaceName={activeWorkspace.name}
        />
      ) : null}

      {workspacesQuery.isError ? (
        <ErrorState
          error={workspacesQuery.error}
          onRetry={() => void workspacesQuery.refetch()}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredWorkspaces}
          emptyAction={
            search ? undefined : (
              <Button
                onClick={() => {
                  createWorkspace.reset();
                  setSelectedWorkspace(null);
                  setFormOpen(true);
                }}
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
                Créer un workspace
              </Button>
            )
          }
          emptyDescription="Créez votre premier workspace pour commencer."
          emptyTitle={search ? "Aucun résultat" : "Aucun workspace"}
          isLoading={workspacesQuery.isPending}
          manualPagination={false}
          manualSorting={false}
          mobileLabels={{
            created_at: "Créé le",
            description: "Description",
            name: "Workspace",
          }}
          onPaginationChange={setPagination}
          onSortingChange={setSorting}
          pageCount={Math.ceil(filteredWorkspaces.length / pagination.pageSize)}
          pagination={pagination}
          sorting={sorting}
          total={filteredWorkspaces.length}
        />
      )}

      <WorkspaceFormDialog
        error={
          selectedWorkspace ? updateWorkspace.error : createWorkspace.error
        }
        errorMessage={
          selectedWorkspace
            ? undefined
            : getPlanLimitMessage(createWorkspace.error)
        }
        isPending={
          selectedWorkspace
            ? updateWorkspace.isPending
            : createWorkspace.isPending
        }
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        open={formOpen}
        workspace={selectedWorkspace}
      />

      <DeleteDialog
        description={`Le workspace « ${selectedWorkspace?.name ?? ""} » et ses ressources deviendront inaccessibles.`}
        error={deleteWorkspace.error}
        errorMessage={getWorkspaceDeletionErrorMessage(deleteWorkspace.error)}
        isPending={deleteWorkspace.isPending}
        onConfirm={handleDelete}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        title="Supprimer le workspace ?"
      />
      <NoticeToast
        notice={billingNotice}
        onDismiss={() => {
          setBillingNotice(null);
        }}
      />
    </div>
  );
}
