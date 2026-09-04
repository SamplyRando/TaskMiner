import { useState } from "react";

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
import { Spinner } from "@/components/ui/spinner";
import { WorkspaceMemberCombobox } from "@/features/workspaces/workspace-member-combobox";
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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    task?.assigned_user_id ?? null,
  );

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(selectedUserId);
      }}
    >
      <WorkspaceMemberCombobox
        currentUserId={currentUserId}
        disabled={isPending}
        error={membersError}
        id="task-assignee"
        isLoading={isMembersLoading}
        label="Membre"
        members={members}
        onRetry={onRetryMembers}
        onValueChange={setSelectedUserId}
        selfAssignLabel="M’assigner cette tâche"
        value={selectedUserId}
      />

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
