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
import { WorkspaceSelector } from "@/components/workspace-selector";
import { useUserPreferences } from "@/features/settings/hooks";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";
import { useSessionState } from "@/hooks/use-session-state";
import {
  useBillingCheckout,
  useBillingPortal,
} from "@/features/subscriptions/billing-hooks";
import { useAuthStore } from "@/store/auth-store";
import { useWorkspaceSubscription } from "@/features/subscriptions/hooks";
import { BillingCheckoutConsentDialog } from "@/features/subscriptions/billing-checkout-consent-dialog";
import { WorkspacePlanCard } from "@/features/subscriptions/workspace-plan-card";
import { getPlanLimitMessage } from "@/features/subscriptions/errors";
import {
  useCreateWorkspace,
  useDeleteWorkspace,
  useRecoverableWorkspaces,
  useRestoreWorkspace,
  useUpdateWorkspace,
} from "@/features/workspaces/hooks";
import { getWorkspaceDeletionErrorMessage } from "@/features/workspaces/errors";
import { getWorkspaceColumns } from "@/features/workspaces/workspace-columns";
import { WorkspaceFormDialog } from "@/features/workspaces/workspace-form-dialog";
import type { Workspace, WorkspaceInput } from "@/types/workspace";
import { formatDate } from "@/lib/format";

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
  const workspace = useActiveWorkspace();
  const preferences = useUserPreferences();
  const pageSizeApplied = useRef(false);
  const billingActionLocked = useRef(false);
  const [billingNotice, setBillingNotice] = useState<Notice | null>(
    getBillingReturnNotice,
  );
  const [billingRedirectError, setBillingRedirectError] = useState<unknown>();
  const [checkoutConsentOpen, setCheckoutConsentOpen] = useState(false);
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

  const activeWorkspace = workspace.activeWorkspace;
  const subscriptionQuery = useWorkspaceSubscription(
    activeWorkspace?.id ?? null,
  );
  const refetchSubscription = subscriptionQuery.refetch;
  const checkout = useBillingCheckout();
  const portal = useBillingPortal();
  const createWorkspace = useCreateWorkspace();
  const updateWorkspace = useUpdateWorkspace();
  const deleteWorkspace = useDeleteWorkspace();
  const recoverableWorkspaces = useRecoverableWorkspaces();
  const restoreWorkspace = useRestoreWorkspace();

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
      return workspace.workspaces;
    }

    return workspace.workspaces.filter(
      (workspace) =>
        workspace.name.toLocaleLowerCase("fr").includes(normalizedSearch) ||
        workspace.description
          ?.toLocaleLowerCase("fr")
          .includes(normalizedSearch),
    );
  }, [search, workspace.workspaces]);

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
        const redirect = await checkout.mutateAsync({
          immediateServiceRequested: true,
          workspaceId: activeWorkspace.id,
        });
        redirectToBillingUrl(redirect.checkout_url);
        setCheckoutConsentOpen(false);
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

  // Kept at a stable place in the tree (page header) so switching never
  // remounts the native select.
  const workspaceSelector = (
    <WorkspaceSelector
      compact
      disabled={workspace.isPending}
      onValueChange={(workspaceId) => {
        workspace.selectWorkspace(workspaceId);
        setPagination((current) => ({ ...current, pageIndex: 0 }));
      }}
      value={workspace.activeWorkspaceId}
      workspaces={workspace.workspaces}
    />
  );

  return (
    <div className="space-y-6">
      <EntityPageHeader
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="w-full sm:w-56">{workspaceSelector}</div>
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
          </div>
        }
        description="Organisez vos projets au sein de vos espaces de travail."
        title="Workspaces"
      />

      {activeWorkspace ? (
        <section
          aria-label="Contexte du workspace actif"
          className="bg-card rounded-card flex min-w-0 flex-col gap-4 border p-5 shadow-xs md:flex-row md:items-center md:justify-between"
        >
          <div className="flex min-w-0 items-center gap-3.5">
            <span
              aria-hidden="true"
              className="bg-brand-subtle text-brand border-brand-border flex size-11 shrink-0 items-center justify-center rounded-lg border text-lg font-semibold"
            >
              {activeWorkspace.name.trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-section-title truncate">
                {activeWorkspace.name}
              </p>
              <p className="text-muted-foreground text-sm">
                Les projets, permissions et quotas affichés suivent ce
                workspace.
              </p>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-2 md:items-end">
            <p className="text-sm font-semibold">
              {subscriptionQuery.isPending
                ? "Chargement du plan…"
                : subscriptionQuery.data
                  ? `Abonnement actif : ${subscriptionQuery.data.plan === "pro" ? "Pro" : "Free"}`
                  : "Plan indisponible"}
            </p>
          </div>
        </section>
      ) : null}

      {activeWorkspace ? (
        <WorkspacePlanCard
          actionError={
            checkoutConsentOpen
              ? (portal.error ?? null)
              : (billingRedirectError ?? checkout.error ?? portal.error ?? null)
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
            checkout.reset();
            setBillingRedirectError(undefined);
            setCheckoutConsentOpen(true);
          }}
          workspaceName={activeWorkspace.name}
        />
      ) : null}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-section-title">Vos workspaces</h2>
          <p className="text-muted-foreground text-sm">
            Tous les espaces auxquels vous avez accès.
          </p>
        </div>
        <div className="relative w-full max-w-md">
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
      </div>

      {workspace.isError ? (
        <ErrorState
          error={workspace.error}
          onRetry={() => void workspace.refetch()}
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
          isLoading={workspace.isPending}
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

      {recoverableWorkspaces.data?.length ? (
        <section
          className="space-y-3 border-t pt-6"
          aria-labelledby="recoverable-workspaces"
        >
          <div>
            <h2 className="font-semibold" id="recoverable-workspaces">
              Workspaces supprimés
            </h2>
            <p className="text-muted-foreground text-sm">
              Vous pouvez restaurer vos workspaces pendant 30 jours.
            </p>
          </div>
          <div className="space-y-2">
            {recoverableWorkspaces.data.map((item) => (
              <div
                className="bg-card rounded-card flex flex-wrap items-center justify-between gap-3 border px-4 py-3 shadow-xs"
                key={item.id}
              >
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-muted-foreground text-sm">
                    Récupérable jusqu’au {formatDate(item.recoverable_until)}
                  </p>
                </div>
                <Button
                  disabled={restoreWorkspace.isPending}
                  onClick={() => {
                    restoreWorkspace.mutate(item.id);
                  }}
                  type="button"
                  variant="outline"
                >
                  Restaurer
                </Button>
              </div>
            ))}
          </div>
          {restoreWorkspace.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {getPlanLimitMessage(restoreWorkspace.error) ??
                "Le workspace n’a pas pu être restauré."}
            </p>
          ) : null}
        </section>
      ) : null}

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
      {activeWorkspace && checkoutConsentOpen ? (
        <BillingCheckoutConsentDialog
          error={billingRedirectError ?? checkout.error}
          isPending={checkout.isPending}
          onConfirm={() => {
            void handleBillingAction("checkout");
          }}
          onOpenChange={setCheckoutConsentOpen}
          open={checkoutConsentOpen}
          workspaceName={activeWorkspace.name}
        />
      ) : null}
      <NoticeToast
        notice={billingNotice}
        onDismiss={() => {
          setBillingNotice(null);
        }}
      />
    </div>
  );
}
