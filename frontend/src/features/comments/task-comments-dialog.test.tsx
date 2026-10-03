import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTaskComment,
  deleteTaskComment,
  listTaskComments,
  updateTaskComment,
} from "@/api/comments";
import { ApiError } from "@/api/client";
import { TaskCommentsDialog } from "@/features/comments/task-comments-dialog";
import { renderWithQuery } from "@/test/query-wrapper";
import { taskFixture, userId } from "@/test/resource-fixtures";
import type { TaskComment } from "@/types/comment";

vi.mock("@/api/comments", () => ({
  createTaskComment: vi.fn(),
  deleteTaskComment: vi.fn(),
  listTaskComments: vi.fn(),
  updateTaskComment: vi.fn(),
}));

const mockedCreate = vi.mocked(createTaskComment);
const mockedDelete = vi.mocked(deleteTaskComment);
const mockedList = vi.mocked(listTaskComments);
const mockedUpdate = vi.mocked(updateTaskComment);

const ownComment: TaskComment = {
  author_id: userId,
  author_name: "Ada Lovelace",
  content: "Préparer la validation.",
  created_at: "2026-10-03T10:00:00Z",
  id: "comment-own",
  task_id: taskFixture.id,
  updated_at: "2026-10-03T10:00:00Z",
};
const otherComment: TaskComment = {
  ...ownComment,
  author_id: "user-other",
  author_name: "Grace Hopper",
  content: "Validation terminée.",
  id: "comment-other",
};

const renderDialog = (canManage = true) =>
  renderWithQuery(
    <TaskCommentsDialog
      canManage={canManage}
      currentUserId={userId}
      onOpenChange={vi.fn()}
      open
      task={taskFixture}
    />,
  );

describe("TaskCommentsDialog", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedList.mockResolvedValue([]);
  });

  it("shows loading and then a clear empty state", async () => {
    let resolveList: ((comments: TaskComment[]) => void) | undefined;
    mockedList.mockReturnValue(
      new Promise((resolve) => {
        resolveList = resolve;
      }),
    );
    renderDialog();

    expect(screen.getByText("Chargement…")).toBeInTheDocument();
    resolveList?.([]);
    expect(
      await screen.findByText("Aucun commentaire pour cette tâche."),
    ).toBeInTheDocument();
  });

  it("lists comments with readable author names", async () => {
    mockedList.mockResolvedValue([ownComment, otherComment]);
    renderDialog();

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("Validation terminée.")).toBeInTheDocument();
  });

  it("adds one comment and prevents a duplicate pending submission", async () => {
    const user = userEvent.setup();
    let resolveCreate: ((comment: TaskComment) => void) | undefined;
    mockedCreate.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    renderDialog();

    await user.type(
      screen.getByLabelText("Ajouter un commentaire"),
      "  Nouveau commentaire  ",
    );
    const addButton = screen.getByRole("button", { name: "Ajouter" });
    await user.click(addButton);
    expect(addButton).toBeDisabled();
    await user.click(addButton);
    expect(mockedCreate).toHaveBeenCalledTimes(1);
    expect(mockedCreate).toHaveBeenCalledWith(taskFixture.id, {
      content: "Nouveau commentaire",
    });

    resolveCreate?.(ownComment);
    expect(await screen.findByText("Commentaire ajouté.")).toBeInTheDocument();
  });

  it("edits only the current user's comment", async () => {
    const user = userEvent.setup();
    mockedList.mockResolvedValue([ownComment, otherComment]);
    mockedUpdate.mockResolvedValue({
      ...ownComment,
      content: "Commentaire actualisé",
    });
    renderDialog();

    await user.click(
      await screen.findByRole("button", { name: "Modifier le commentaire" }),
    );
    const editor = screen.getByLabelText("Contenu du commentaire");
    await user.clear(editor);
    await user.type(editor, "Commentaire actualisé");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => {
      expect(mockedUpdate).toHaveBeenCalledWith(ownComment.id, {
        content: "Commentaire actualisé",
      });
    });
    expect(
      screen.getAllByRole("button", { name: "Modifier le commentaire" }),
    ).toHaveLength(1);
  });

  it("deletes an authored comment only after confirmation", async () => {
    const user = userEvent.setup();
    mockedList.mockResolvedValue([ownComment]);
    mockedDelete.mockResolvedValue();
    renderDialog();

    await user.click(
      await screen.findByRole("button", { name: "Supprimer le commentaire" }),
    );
    expect(screen.getByText("Supprimer ce commentaire ?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Supprimer" }));

    await waitFor(() => {
      expect(mockedDelete).toHaveBeenCalledWith(ownComment.id);
    });
  });

  it("cancels deletion and leaves the comment untouched", async () => {
    const user = userEvent.setup();
    mockedList.mockResolvedValue([ownComment]);
    renderDialog();

    await user.click(
      await screen.findByRole("button", { name: "Supprimer le commentaire" }),
    );
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(mockedDelete).not.toHaveBeenCalled();
    expect(screen.queryByText("Supprimer ce commentaire ?")).toBeNull();
  });

  it("keeps viewers read-only and reports permission failures", async () => {
    const user = userEvent.setup();
    mockedList
      .mockRejectedValueOnce(new ApiError("Insufficient permissions.", 403))
      .mockResolvedValueOnce([ownComment]);
    renderDialog(false);

    expect(
      await screen.findByText(
        "Vous n’avez pas la permission d’effectuer cette action.",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.queryByLabelText("Ajouter un commentaire")).toBeNull();
    expect(
      screen.getByText(/consulter les commentaires en lecture seule/),
    ).toBeInTheDocument();
  });
});
