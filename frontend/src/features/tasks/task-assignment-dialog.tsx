import { Search, UserCheck, UserMinus } from "lucide-react";
import { useId, useMemo, useState, type KeyboardEvent } from "react";

import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";
import type { AssignableWorkspaceMember } from "@/types/workspace";

type TaskAssignmentDialogProps = {
  currentUserId: string;
  error?: unknown;
  isMembersLoading: boolean;
  isPending: boolean;
  members: AssignableWorkspaceMember[];
  membersError?: unknown;
  onOpenChange: (open: boolean) => void;
  onRetryMembers: () => void;
  onSubmit: (assignedUserId: string | null) => Promise<void>;
  open: boolean;
  task: Task | null;
};

const getMemberPrimaryLabel = (member: AssignableWorkspaceMember): string =>
  member.full_name?.trim() ? member.full_name.trim() : member.email;

const getMemberAccessibleLabel = (member: AssignableWorkspaceMember): string =>
  member.full_name?.trim()
    ? `${member.full_name} — ${member.email}`
    : member.email;

type TaskAssignmentFormProps = Omit<
  TaskAssignmentDialogProps,
  "onOpenChange" | "open"
> & {
  onCancel: () => void;
};

function TaskAssignmentForm({
  currentUserId,
  error,
  isMembersLoading,
  isPending,
  members,
  membersError,
  onCancel,
  onRetryMembers,
  onSubmit,
  task,
}: TaskAssignmentFormProps) {
  const listboxId = useId();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isListOpen, setIsListOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    task?.assigned_user_id ?? null,
  );

  const filteredMembers = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("fr");
    if (!normalizedSearch) return members;
    return members.filter(
      (member) =>
        member.email.toLocaleLowerCase("fr").includes(normalizedSearch) ||
        member.full_name?.toLocaleLowerCase("fr").includes(normalizedSearch),
    );
  }, [members, search]);
  const selectedMember = members.find(
    (member) => member.user_id === selectedUserId,
  );
  const currentUserIsAssignable = members.some(
    (member) => member.user_id === currentUserId,
  );
  const activeMember = filteredMembers[activeIndex];

  const selectMember = (member: AssignableWorkspaceMember) => {
    setSelectedUserId(member.user_id);
    setSearch("");
    setIsListOpen(false);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsListOpen(false);
      return;
    }
    if (filteredMembers.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsListOpen(true);
      setActiveIndex((current) => (current + 1) % filteredMembers.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsListOpen(true);
      setActiveIndex(
        (current) =>
          (current - 1 + filteredMembers.length) % filteredMembers.length,
      );
      return;
    }
    if (event.key === "Enter" && isListOpen && activeMember) {
      event.preventDefault();
      selectMember(activeMember);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(selectedUserId);
      }}
    >
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="task-assignee">
          Membre
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            aria-activedescendant={
              isListOpen && activeMember
                ? `${listboxId}-${activeMember.user_id}`
                : undefined
            }
            aria-autocomplete="list"
            aria-controls={listboxId}
            aria-expanded={isListOpen}
            autoComplete="off"
            className="pl-9"
            disabled={isMembersLoading || Boolean(membersError) || isPending}
            id="task-assignee"
            onBlur={() => {
              setIsListOpen(false);
            }}
            onChange={(event) => {
              setSearch(event.target.value);
              setActiveIndex(0);
              setIsListOpen(true);
            }}
            onFocus={() => {
              setIsListOpen(true);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Rechercher par nom ou adresse e-mail…"
            role="combobox"
            value={search}
          />
        </div>

        {isMembersLoading ? (
          <div
            className="text-muted-foreground flex items-center gap-2 py-2 text-sm"
            role="status"
          >
            <Spinner className="size-4" />
            Chargement des membres…
          </div>
        ) : null}

        {membersError ? (
          <div className="space-y-2">
            <FormError error={membersError} />
            <Button
              onClick={onRetryMembers}
              size="sm"
              type="button"
              variant="outline"
            >
              Réessayer
            </Button>
          </div>
        ) : null}

        {isListOpen && !isMembersLoading && !membersError ? (
          <div
            className="bg-popover max-h-56 overflow-y-auto rounded-lg border p-1 shadow-md"
            id={listboxId}
            role="listbox"
          >
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member, index) => (
                <button
                  aria-label={getMemberAccessibleLabel(member)}
                  aria-selected={member.user_id === selectedUserId}
                  className={cn(
                    "hover:bg-accent focus-visible:ring-ring flex w-full items-center gap-3 rounded-md px-3 py-2 text-left outline-none focus-visible:ring-2",
                    index === activeIndex && "bg-accent",
                  )}
                  id={`${listboxId}-${member.user_id}`}
                  key={member.user_id}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onMouseEnter={() => {
                    setActiveIndex(index);
                  }}
                  onClick={() => {
                    selectMember(member);
                  }}
                  role="option"
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {getMemberPrimaryLabel(member)}
                    </span>
                    {member.full_name?.trim() ? (
                      <span className="text-muted-foreground block truncate text-xs">
                        {member.email}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))
            ) : (
              <p className="text-muted-foreground px-3 py-4 text-center text-sm">
                {members.length === 0
                  ? "Aucun membre actif disponible."
                  : "Aucun membre ne correspond à cette recherche."}
              </p>
            )}
          </div>
        ) : null}
      </div>

      {selectedUserId ? (
        <div
          aria-live="polite"
          className="bg-muted/50 flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {selectedMember
                ? getMemberPrimaryLabel(selectedMember)
                : "Membre actuellement indisponible"}
            </p>
            {selectedMember?.full_name?.trim() ? (
              <p className="text-muted-foreground truncate text-xs">
                {selectedMember.email}
              </p>
            ) : null}
          </div>
          <Button
            aria-label="Retirer l’assignation"
            disabled={isPending}
            onClick={() => {
              setSelectedUserId(null);
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            <UserMinus aria-hidden="true" className="size-4" />
            Retirer
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm" role="status">
          Cette tâche n’est assignée à personne.
        </p>
      )}

      <Button
        disabled={
          isPending ||
          isMembersLoading ||
          Boolean(membersError) ||
          !currentUserIsAssignable
        }
        onClick={() => {
          setSelectedUserId(currentUserId);
          setSearch("");
          setIsListOpen(false);
        }}
        size="sm"
        type="button"
        variant="outline"
      >
        <UserCheck aria-hidden="true" className="size-4" />
        M’assigner cette tâche
      </Button>

      <FormError error={error} />

      <DialogFooter>
        <Button
          disabled={isPending}
          onClick={onCancel}
          type="button"
          variant="outline"
        >
          Annuler
        </Button>
        <Button
          disabled={isPending || isMembersLoading || Boolean(membersError)}
          type="submit"
        >
          {isPending ? <Spinner className="mr-2" /> : null}
          Enregistrer
        </Button>
      </DialogFooter>
    </form>
  );
}

export function TaskAssignmentDialog(props: TaskAssignmentDialogProps) {
  const { onOpenChange, open, task } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assigner la tâche</DialogTitle>
          <DialogDescription>
            Recherchez un membre actif du workspace par nom ou adresse e-mail.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <TaskAssignmentForm
            currentUserId={props.currentUserId}
            error={props.error}
            isMembersLoading={props.isMembersLoading}
            isPending={props.isPending}
            key={`${task?.id ?? "none"}:${task?.assigned_user_id ?? "none"}`}
            members={props.members}
            membersError={props.membersError}
            onCancel={() => {
              onOpenChange(false);
            }}
            onRetryMembers={props.onRetryMembers}
            onSubmit={props.onSubmit}
            task={task}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
