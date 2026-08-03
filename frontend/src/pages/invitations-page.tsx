import type { PaginationState, SortingState } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, MailPlus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { ApiError } from "@/api/client";
import { DataTable } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/empty-state";
import { EntityPageHeader } from "@/components/entity-page-header";
import { ErrorState } from "@/components/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceSelector } from "@/components/workspace-selector";
import { InvitationAccessState } from "@/features/invitations/invitation-access-state";
import { InvitationCard } from "@/features/invitations/invitation-card";
import { getInvitationColumns } from "@/features/invitations/invitation-columns";
import { InvitationFormDialog } from "@/features/invitations/invitation-form-dialog";
import { InvitationListSkeleton } from "@/features/invitations/invitation-list-skeleton";
import { InvitationRevokeDialog } from "@/features/invitations/invitation-revoke-dialog";
import {
  type InvitationNotice,
  InvitationToast,
} from "@/features/invitations/invitation-toast";
import {
  useAcceptInvitation,
  useCreateInvitation,
  useInvitation,
  useRevokeInvitation,
  useWorkspaceInvitations,
} from "@/features/invitations/hooks";
import { RecipientInvitationCard } from "@/features/invitations/recipient-invitation-card";
import { useUserPreferences } from "@/features/settings/hooks";
import { useWorkspacePermissions } from "@/features/workspaces/permissions-hooks";
import { useActiveWorkspace } from "@/hooks/use-active-workspace";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSessionState } from "@/hooks/use-session-state";
import { useAuthStore } from "@/store/auth-store";
import type {
  InvitationCreate,
  InvitationSort,
  WorkspaceInvitation,
} from "@/types/invitation";

const initialPagination: PaginationState = { pageIndex: 0, pageSize: 20 };
const initialSorting: SortingState = [{ desc: true, id: "created_at" }];
const sortableFields = new Set([
  "email",
  "role",
  "status",
  "created_at",
  "expires_at",
]);

type WorkspacePagination = PaginationState & {
  workspaceId: string | null;
};

const getServerSort = (sorting: SortingState): InvitationSort => {
  const current = sorting[0];
  if (!current || !sortableFields.has(current.id)) {
    return "-created_at";
  }
  return `${current.desc ? "-" : ""}${current.id}` as InvitationSort;
};

const isAccessError = (error: unknown): boolean =>
  error instanceof ApiError && (error.status === 403 || error.status === 404);

export function InvitationsPage() {
  const navigate = useNavigate();
  const preferences = useUserPreferences();
  const pageSizeApplied = useRef(false);
  const workspace = useActiveWorkspace();
  const currentUser = useAuthStore((state) => state.currentUser);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get("token");
  const [search, setSearch] = useSessionState(
    "taskminer-invitations-search",
    "",
  );
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [paginationState, setPaginationState] =
    useSessionState<WorkspacePagination>("taskminer-invitations-pagination", {
      ...initialPagination,
      workspaceId: null,
    });
  const pagination =
    paginationState.workspaceId === workspace.activeWorkspaceId
      ? paginationState
      : { ...initialPagination, workspaceId: workspace.activeWorkspaceId };
  const [sorting, setSorting] = useSessionState<SortingState>(
    "taskminer-invitations-sorting",
    initialSorting,
  );
  const [formOpen, setFormOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [selectedInvitation, setSelectedInvitation] =
    useState<WorkspaceInvitation | null>(null);
  const [notice, setNotice] = useState<InvitationNotice | null>(null);

  useEffect(() => {
    if (!preferences.data || pageSizeApplied.current) return;
    pageSizeApplied.current = true;
    setPaginationState((current) =>
      current.pageSize === preferences.data.items_per_page
        ? current
        : {
            ...current,
            pageIndex: 0,
            pageSize: preferences.data.items_per_page,
          },
    );
  }, [preferences.data, setPaginationState]);

  const permissionsQuery = useWorkspacePermissions(workspace.activeWorkspaceId);
  const canManage = Boolean(
    permissionsQuery.data?.permissions.manage_invitations,
  );
  const listParams = useMemo(
    () => ({
      limit: pagination.pageSize,
      skip: pagination.pageIndex * pagination.pageSize,
      sort: getServerSort(sorting),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }),
    [debouncedSearch, pagination.pageIndex, pagination.pageSize, sorting],
  );
  const invitationsQuery = useWorkspaceInvitations(
    workspace.activeWorkspaceId,
    listParams,
    permissionsQuery.isSuccess && canManage,
  );
  const invitationQuery = useInvitation(invitationToken);
  const createInvitation = useCreateInvitation();
  const revokeInvitation = useRevokeInvitation();
  const acceptInvitation = useAcceptInvitation();
  const total = invitationsQuery.data?.total ?? 0;
  const pageCount = Math.ceil(total / pagination.pageSize);
  const columns = useMemo(
    () =>
      getInvitationColumns({
        canManage,
        onRevoke: (invitation) => {
          revokeInvitation.reset();
          setSelectedInvitation(invitation);
          setRevokeOpen(true);
        },
      }),
    [canManage, revokeInvitation],
  );

  const setPage = (pageIndex: number) => {
    setPaginationState({
      ...pagination,
      pageIndex,
      workspaceId: workspace.activeWorkspaceId,
    });
  };

  const handleCreate = async (data: InvitationCreate) => {
    if (!workspace.activeWorkspaceId) {
      return;
    }
    try {
      await createInvitation.mutateAsync({
        data,
        workspaceId: workspace.activeWorkspaceId,
      });
      setFormOpen(false);
      setNotice({ message: "Invitation envoyée.", type: "success" });
    } catch {
      setNotice({
        message: "L’invitation n’a pas pu être envoyée.",
        type: "error",
      });
    }
  };

  const handleRevoke = async () => {
    if (!selectedInvitation) {
      return;
    }
    try {
      await revokeInvitation.mutateAsync(selectedInvitation.token);
      setRevokeOpen(false);
      setSelectedInvitation(null);
      setNotice({ message: "Invitation révoquée.", type: "success" });
    } catch {
      setNotice({ message: "La révocation a échoué.", type: "error" });
    }
  };

  const handleAccept = async () => {
    if (!invitationToken) {
      return;
    }
    try {
      await acceptInvitation.mutateAsync(invitationToken);
      setNotice({ message: "Invitation acceptée.", type: "success" });
    } catch {
      setNotice({ message: "L’acceptation a échoué.", type: "error" });
    }
  };

  const handleDecline = async () => {
    if (!invitationToken) {
      return;
    }
    try {
      await revokeInvitation.mutateAsync(invitationToken);
      setNotice({ message: "Invitation refusée.", type: "success" });
    } catch {
      setNotice({ message: "Le refus a échoué.", type: "error" });
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      <EntityPageHeader
        actions={
          <div className="flex flex-col gap-2 sm:flex-row">
            <WorkspaceSelector
              disabled={workspace.isPending}
              onValueChange={(workspaceId) => {
                workspace.selectWorkspace(workspaceId);
                setPaginationState({ ...initialPagination, workspaceId });
                setSelectedInvitation(null);
                setRevokeOpen(false);
              }}
              value={workspace.activeWorkspaceId}
              workspaces={workspace.workspaces}
            />
            {canManage ? (
              <Button
                onClick={() => {
                  createInvitation.reset();
                  setFormOpen(true);
                }}
                type="button"
              >
                <MailPlus aria-hidden="true" className="size-4" />
                Inviter un membre
              </Button>
            ) : null}
          </div>
        }
        description="Invitez et gérez les futurs membres de votre workspace."
        title="Invitations"
      />

      {invitationToken ? (
        invitationQuery.isPending ? (
          <InvitationListSkeleton />
        ) : invitationQuery.isError ? (
          isAccessError(invitationQuery.error) ? (
            <InvitationAccessState error={invitationQuery.error} />
          ) : (
            <ErrorState
              error={invitationQuery.error}
              onRetry={() => void invitationQuery.refetch()}
            />
          )
        ) : (
          <RecipientInvitationCard
            acceptError={acceptInvitation.error}
            currentUserEmail={currentUser?.email ?? null}
            declineError={revokeInvitation.error}
            invitation={invitationQuery.data}
            isAccepting={acceptInvitation.isPending}
            isDeclining={revokeInvitation.isPending}
            onAccept={handleAccept}
            onDecline={handleDecline}
          />
        )
      ) : null}

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
              <Button
                onClick={() => {
                  void navigate("/app/workspace");
                }}
                type="button"
              >
                Créer un workspace
              </Button>
            }
            description="Créez un workspace avant d’inviter des membres."
            icon={MailPlus}
            title="Aucun workspace"
          />
        </div>
      ) : null}

      {workspace.activeWorkspaceId && !workspace.isError ? (
        permissionsQuery.isPending ? (
          <InvitationListSkeleton />
        ) : permissionsQuery.isError ? (
          isAccessError(permissionsQuery.error) ? (
            <InvitationAccessState error={permissionsQuery.error} />
          ) : (
            <ErrorState
              error={permissionsQuery.error}
              onRetry={() => void permissionsQuery.refetch()}
            />
          )
        ) : !canManage ? (
          <InvitationAccessState error={new ApiError("Accès interdit", 403)} />
        ) : (
          <>
            <div className="relative max-w-md">
              <Search
                aria-hidden="true"
                className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
              />
              <Input
                aria-label="Rechercher une invitation"
                className="pl-9"
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                placeholder="Rechercher par email ou auteur…"
                type="search"
                value={search}
              />
            </div>

            {invitationsQuery.isError ? (
              isAccessError(invitationsQuery.error) ? (
                <InvitationAccessState error={invitationsQuery.error} />
              ) : (
                <ErrorState
                  error={invitationsQuery.error}
                  onRetry={() => void invitationsQuery.refetch()}
                />
              )
            ) : isMobile ? (
              invitationsQuery.isPending ? (
                <InvitationListSkeleton />
              ) : (
                <div className="space-y-4">
                  {invitationsQuery.data.items.length === 0 ? (
                    <div className="bg-card rounded-xl border">
                      <EmptyState
                        action={
                          debouncedSearch ? (
                            <Button
                              onClick={() => {
                                setSearch("");
                                setPage(0);
                              }}
                              type="button"
                              variant="outline"
                            >
                              Effacer la recherche
                            </Button>
                          ) : (
                            <Button
                              onClick={() => {
                                createInvitation.reset();
                                setFormOpen(true);
                              }}
                              type="button"
                            >
                              <MailPlus aria-hidden="true" className="size-4" />
                              Inviter un membre
                            </Button>
                          )
                        }
                        description={
                          debouncedSearch
                            ? "Aucune invitation ne correspond à cette recherche."
                            : "Invitez un membre pour le faire rejoindre ce workspace."
                        }
                        icon={MailPlus}
                        title={
                          debouncedSearch
                            ? "Aucun résultat"
                            : "Aucune invitation"
                        }
                      />
                    </div>
                  ) : (
                    invitationsQuery.data.items.map((invitation) => (
                      <InvitationCard
                        canManage={canManage}
                        invitation={invitation}
                        key={invitation.id}
                        onRevoke={(item) => {
                          revokeInvitation.reset();
                          setSelectedInvitation(item);
                          setRevokeOpen(true);
                        }}
                      />
                    ))
                  )}
                  <nav
                    aria-label="Pagination des invitations"
                    className="flex items-center justify-between"
                  >
                    <p className="text-muted-foreground text-sm">
                      {total} invitation{total > 1 ? "s" : ""}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        aria-label="Page précédente"
                        disabled={pagination.pageIndex === 0}
                        onClick={() => {
                          setPage(Math.max(pagination.pageIndex - 1, 0));
                        }}
                        size="icon"
                        type="button"
                        variant="outline"
                      >
                        <ChevronLeft aria-hidden="true" className="size-4" />
                      </Button>
                      <Button
                        aria-label="Page suivante"
                        disabled={
                          (pagination.pageIndex + 1) * pagination.pageSize >=
                          total
                        }
                        onClick={() => {
                          setPage(pagination.pageIndex + 1);
                        }}
                        size="icon"
                        type="button"
                        variant="outline"
                      >
                        <ChevronRight aria-hidden="true" className="size-4" />
                      </Button>
                    </div>
                  </nav>
                </div>
              )
            ) : (
              <DataTable
                columns={columns}
                data={invitationsQuery.data?.items ?? []}
                emptyAction={
                  debouncedSearch ? (
                    <Button
                      onClick={() => {
                        setSearch("");
                        setPage(0);
                      }}
                      type="button"
                      variant="outline"
                    >
                      Effacer la recherche
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        createInvitation.reset();
                        setFormOpen(true);
                      }}
                      type="button"
                    >
                      <MailPlus aria-hidden="true" className="size-4" />
                      Inviter un membre
                    </Button>
                  )
                }
                emptyDescription={
                  debouncedSearch
                    ? "Aucune invitation ne correspond à cette recherche."
                    : "Invitez un membre pour le faire rejoindre ce workspace."
                }
                emptyTitle={
                  debouncedSearch ? "Aucun résultat" : "Aucune invitation"
                }
                isLoading={invitationsQuery.isPending}
                manualPagination
                manualSorting
                mobileLabels={{
                  created_at: "Créée le",
                  email: "E-mail",
                  expires_at: "Expiration",
                  invited_by: "Invité par",
                  role: "Rôle",
                  status: "Statut",
                }}
                onPaginationChange={(updater) => {
                  setPaginationState((current) => {
                    const next =
                      typeof updater === "function"
                        ? updater(current)
                        : updater;
                    return {
                      ...next,
                      workspaceId: workspace.activeWorkspaceId,
                    };
                  });
                }}
                onSortingChange={(updater) => {
                  setSorting((current) =>
                    typeof updater === "function" ? updater(current) : updater,
                  );
                  setPage(0);
                }}
                pageCount={pageCount}
                pagination={pagination}
                sorting={sorting}
                total={total}
              />
            )}
          </>
        )
      ) : null}

      <InvitationFormDialog
        error={createInvitation.error}
        isPending={createInvitation.isPending}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        open={formOpen}
      />
      <InvitationRevokeDialog
        error={revokeInvitation.error}
        invitation={selectedInvitation}
        isPending={revokeInvitation.isPending}
        onConfirm={handleRevoke}
        onOpenChange={setRevokeOpen}
        open={revokeOpen}
      />
      <InvitationToast
        notice={notice}
        onDismiss={() => {
          setNotice(null);
        }}
      />
    </div>
  );
}
