import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteAttachment,
  downloadAttachment,
  listTaskAttachments,
  uploadTaskAttachment,
} from "@/api/attachments";
import { ApiError } from "@/api/client";
import { TaskAttachmentsDialog } from "@/features/attachments/task-attachments-dialog";
import { renderWithQuery } from "@/test/query-wrapper";
import { taskFixture } from "@/test/resource-fixtures";
import type { Attachment } from "@/types/attachment";

vi.mock("@/api/attachments", () => ({
  deleteAttachment: vi.fn(),
  downloadAttachment: vi.fn(),
  listTaskAttachments: vi.fn(),
  uploadTaskAttachment: vi.fn(),
}));

const mockedDeleteAttachment = vi.mocked(deleteAttachment);
const mockedDownloadAttachment = vi.mocked(downloadAttachment);
const mockedListTaskAttachments = vi.mocked(listTaskAttachments);
const mockedUploadTaskAttachment = vi.mocked(uploadTaskAttachment);

const attachment: Attachment = {
  content_type: "application/pdf",
  created_at: "2026-09-10T10:00:00Z",
  file_size: 2048,
  filename: "report.pdf",
  id: "attachment-1",
  task_id: taskFixture.id,
  updated_at: "2026-09-10T10:00:00Z",
};

const renderDialog = (canManage = true) =>
  renderWithQuery(
    <TaskAttachmentsDialog
      canManage={canManage}
      onOpenChange={vi.fn()}
      open
      task={taskFixture}
    />,
  );

describe("TaskAttachmentsDialog", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedListTaskAttachments.mockResolvedValue([]);
  });

  it("shows a clear empty state", async () => {
    renderDialog();

    expect(
      await screen.findByText("Aucun fichier joint à cette tâche."),
    ).toBeInTheDocument();
  });

  it("shows existing attachments and a read-only state", async () => {
    mockedListTaskAttachments.mockResolvedValue([attachment]);
    renderDialog(false);

    expect(await screen.findByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText("2 Ko")).toBeInTheDocument();
    expect(
      screen.getByText(
        /consulter et télécharger les fichiers en lecture seule/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Ajouter un fichier")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Supprimer report.pdf" }),
    ).toBeNull();
  });

  it("uploads a file and refreshes the list", async () => {
    const user = userEvent.setup();
    mockedListTaskAttachments
      .mockResolvedValueOnce([])
      .mockResolvedValue([attachment]);
    mockedUploadTaskAttachment.mockResolvedValue(attachment);
    renderDialog();
    const file = new File(["content"], "report.pdf", {
      type: "application/pdf",
    });

    await user.upload(screen.getByLabelText("Ajouter un fichier"), file);

    await waitFor(() => {
      expect(mockedUploadTaskAttachment).toHaveBeenCalledWith(
        taskFixture.id,
        file,
      );
    });
    expect(await screen.findByText("report.pdf")).toBeInTheDocument();
    expect(
      screen.getByText("« report.pdf » a été ajouté."),
    ).toBeInTheDocument();
  });

  it("shows a useful backend rejection for an oversized upload", async () => {
    const user = userEvent.setup();
    mockedUploadTaskAttachment.mockRejectedValue(
      new ApiError("File exceeds the maximum size of 10 MB.", 413),
    );
    renderDialog();

    await user.upload(
      screen.getByLabelText("Ajouter un fichier"),
      new File(["content"], "large.pdf", { type: "application/pdf" }),
    );

    expect(
      await screen.findByText(
        "Ce fichier dépasse la taille maximale autorisée de 10 Mo.",
      ),
    ).toBeInTheDocument();
  });

  it("downloads a blob with the original filename", async () => {
    const user = userEvent.setup();
    const blob = new Blob(["content"], { type: "application/pdf" });
    const createObjectURL = vi.fn(() => "blob:attachment");
    const revokeObjectURL = vi.fn();
    let downloadedFilename = "";
    Object.defineProperty(window.URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      function click(this: HTMLAnchorElement) {
        downloadedFilename = this.download;
      },
    );
    mockedListTaskAttachments.mockResolvedValue([attachment]);
    mockedDownloadAttachment.mockResolvedValue(blob);
    renderDialog();

    await user.click(
      await screen.findByRole("button", { name: "Télécharger report.pdf" }),
    );

    await waitFor(() => {
      expect(mockedDownloadAttachment).toHaveBeenCalledWith(attachment.id);
    });
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(downloadedFilename).toBe("report.pdf");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:attachment");
  });

  it("deletes an attachment after confirmation and refreshes the list", async () => {
    const user = userEvent.setup();
    mockedListTaskAttachments
      .mockResolvedValueOnce([attachment])
      .mockResolvedValue([]);
    mockedDeleteAttachment.mockResolvedValue();
    renderDialog();

    await user.click(
      await screen.findByRole("button", { name: "Supprimer report.pdf" }),
    );
    expect(
      screen.getByText("Supprimer définitivement « report.pdf » ?"),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "Confirmer la suppression de report.pdf",
      }),
    );

    await waitFor(() => {
      expect(mockedDeleteAttachment).toHaveBeenCalledWith(attachment.id);
    });
    expect(
      await screen.findByText("Aucun fichier joint à cette tâche."),
    ).toBeInTheDocument();
  });

  it("cancels attachment deletion without a mutation", async () => {
    const user = userEvent.setup();
    mockedListTaskAttachments.mockResolvedValue([attachment]);
    renderDialog();

    await user.click(
      await screen.findByRole("button", { name: "Supprimer report.pdf" }),
    );
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(mockedDeleteAttachment).not.toHaveBeenCalled();
    expect(
      screen.queryByText("Supprimer définitivement « report.pdf » ?"),
    ).toBeNull();
  });

  it("shows permission failures and supports retrying the list", async () => {
    const user = userEvent.setup();
    mockedListTaskAttachments
      .mockRejectedValueOnce(new ApiError("Insufficient permissions.", 403))
      .mockResolvedValueOnce([]);
    renderDialog();

    expect(
      await screen.findByText(
        "Vous n’avez pas la permission d’effectuer cette action.",
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(
      await screen.findByText("Aucun fichier joint à cette tâche."),
    ).toBeInTheDocument();
    expect(mockedListTaskAttachments).toHaveBeenCalledTimes(2);
  });

  it("shows the workspace quota error", async () => {
    const user = userEvent.setup();
    mockedUploadTaskAttachment.mockRejectedValue(
      new ApiError("Workspace attachment storage quota exceeded.", 409, {
        detail: { code: "attachment_storage_quota_exceeded" },
      }),
    );
    renderDialog();

    await user.upload(
      screen.getByLabelText("Ajouter un fichier"),
      new File(["content"], "report.pdf", { type: "application/pdf" }),
    );

    expect(
      await screen.findByText(
        "Le quota de stockage des pièces jointes du workspace est dépassé.",
      ),
    ).toBeInTheDocument();
  });

  it("disables the file field and prevents a second upload while pending", async () => {
    const user = userEvent.setup();
    let resolveUpload: ((value: Attachment) => void) | undefined;
    mockedUploadTaskAttachment.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );
    renderDialog();
    const input = screen.getByLabelText("Ajouter un fichier");

    await user.upload(
      input,
      new File(["first"], "first.pdf", { type: "application/pdf" }),
    );
    await waitFor(() => {
      expect(input).toBeDisabled();
    });
    await user.upload(
      input,
      new File(["second"], "second.pdf", { type: "application/pdf" }),
    );

    expect(mockedUploadTaskAttachment).toHaveBeenCalledTimes(1);
    resolveUpload?.(attachment);
    await waitFor(() => {
      expect(input).toBeEnabled();
    });
  });
});
