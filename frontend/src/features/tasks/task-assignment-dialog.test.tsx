import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/api/client";
import { TaskAssignmentDialog } from "@/features/tasks/task-assignment-dialog";
import { taskFixture, userId } from "@/test/resource-fixtures";
import type { AssignableWorkspaceMember } from "@/types/workspace";

const graceId = "00000000-0000-4000-8000-000000000020";
const members: AssignableWorkspaceMember[] = [
  {
    email: "ada@example.com",
    full_name: "Ada Lovelace",
    role: "owner",
    user_id: userId,
  },
  {
    email: "grace@example.com",
    full_name: "Grace Hopper",
    role: "member",
    user_id: graceId,
  },
];

const renderDialog = (
  overrides: Partial<ComponentProps<typeof TaskAssignmentDialog>> = {},
) => {
  const onRetryMembers = vi.fn();
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(
    <TaskAssignmentDialog
      currentUserId={userId}
      isMembersLoading={false}
      isPending={false}
      members={members}
      onOpenChange={vi.fn()}
      onRetryMembers={onRetryMembers}
      onSubmit={onSubmit}
      open
      task={taskFixture}
      {...overrides}
    />,
  );
  return { onRetryMembers, onSubmit };
};

describe("TaskAssignmentDialog", () => {
  it("searches members by email and submits the selected user id", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog();

    await user.type(
      screen.getByRole("combobox", { name: "Membre" }),
      "grace@example.com",
    );
    await user.click(
      screen.getByRole("option", {
        name: "Grace Hopper — grace@example.com",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(onSubmit).toHaveBeenCalledWith(graceId);
    expect(screen.queryByText(graceId)).not.toBeInTheDocument();
  });

  it("searches members by full name and supports keyboard selection", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog();
    const search = screen.getByRole("combobox", { name: "Membre" });

    await user.type(search, "Grace Hopper");
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(onSubmit).toHaveBeenCalledWith(graceId);
  });

  it("supports assigning the authenticated user", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog();

    await user.click(
      screen.getByRole("button", { name: "M’assigner cette tâche" }),
    );
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(onSubmit).toHaveBeenCalledWith(userId);
  });

  it("shows and removes the current assignment", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog({
      task: { ...taskFixture, assigned_user_id: graceId },
    });

    expect(screen.getAllByText("Grace Hopper")).not.toHaveLength(0);
    expect(screen.getAllByText("grace@example.com")).not.toHaveLength(0);
    await user.click(
      screen.getByRole("button", { name: "Retirer l’assignation" }),
    );
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(onSubmit).toHaveBeenCalledWith(null);
  });

  it("shows an empty search state without exposing identifiers", async () => {
    const user = userEvent.setup();
    renderDialog({ members: [] });

    await user.click(screen.getByRole("combobox", { name: "Membre" }));

    expect(
      screen.getByText("Aucun membre actif disponible."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "M’assigner cette tâche" }),
    ).toBeDisabled();
  });

  it("shows the member loading state", () => {
    renderDialog({ isMembersLoading: true, members: [] });

    expect(screen.getByText("Chargement des membres…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  });

  it("shows the member API error state with retry", async () => {
    const user = userEvent.setup();
    const { onRetryMembers } = renderDialog({
      members: [],
      membersError: new ApiError("Membres indisponibles", 503),
    });
    expect(screen.getByText("Membres indisponibles")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(onRetryMembers).toHaveBeenCalledOnce();
  });
});
