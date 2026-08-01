import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listWorkspaceAudit } from "@/api/audit";
import { ApiError } from "@/api/client";
import { listWorkspaces } from "@/api/workspace";
import { AuditPage } from "@/pages/audit-page";
import { useWorkspaceStore } from "@/store/workspace-store";
import {
  auditFeedFixture,
  auditLogFixture,
  firstWorkspace,
  secondWorkspace,
} from "@/test/activity-fixtures";
import { renderWithQuery } from "@/test/query-wrapper";

vi.mock("@/api/audit", () => ({
  listWorkspaceAudit: vi.fn(),
}));

vi.mock("@/api/workspace", () => ({
  createWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  listWorkspaces: vi.fn(),
  updateWorkspace: vi.fn(),
}));

const mockedListAudit = vi.mocked(listWorkspaceAudit);
const mockedListWorkspaces = vi.mocked(listWorkspaces);

describe("AuditPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    useWorkspaceStore.setState({ activeWorkspaceId: null });
    mockedListWorkspaces.mockResolvedValue([firstWorkspace, secondWorkspace]);
    mockedListAudit.mockResolvedValue(auditFeedFixture);
  });

  it("loads audit logs and opens the before/after detail", async () => {
    const user = userEvent.setup();
    renderWithQuery(<AuditPage />);

    await user.click(
      await screen.findByRole("button", {
        name: "Voir le détail de Tâche modifiée",
      }),
    );

    expect(
      screen.getByRole("dialog", { name: "Tâche modifiée" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Avant")).toBeInTheDocument();
    expect(screen.getByText("Non renseigné")).toBeInTheDocument();
    expect(screen.getByText("urgent")).toBeInTheDocument();
  });

  it("combines event and resource filters", async () => {
    const user = userEvent.setup();
    renderWithQuery(<AuditPage />);

    await screen.findByRole("button", {
      name: "Voir le détail de Tâche modifiée",
    });
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Type d’événement" }),
      "task_updated",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Type de ressource" }),
      "task",
    );

    await waitFor(() => {
      expect(mockedListAudit).toHaveBeenLastCalledWith(firstWorkspace.id, {
        event_type: "task_updated",
        limit: 20,
        offset: 0,
        resource_type: "task",
      });
    });
  });

  it("uses server pagination", async () => {
    const user = userEvent.setup();
    mockedListAudit.mockResolvedValue({
      count: 21,
      items: [auditLogFixture],
    });
    renderWithQuery(<AuditPage />);

    await screen.findByRole("button", {
      name: "Voir le détail de Tâche modifiée",
    });
    await user.click(screen.getByRole("button", { name: "Page suivante" }));

    await waitFor(() => {
      expect(mockedListAudit).toHaveBeenLastCalledWith(firstWorkspace.id, {
        limit: 20,
        offset: 20,
      });
    });
  });

  it("shows the owner and admin permission message for a 403", async () => {
    mockedListAudit.mockRejectedValue(
      new ApiError("Insufficient permissions.", 403),
    );
    renderWithQuery(<AuditPage />);

    expect(
      await screen.findByText("Accès à l’audit restreint"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/réservé aux propriétaires et administrateurs/),
    ).toBeInTheDocument();
  });

  it("renders the loading skeleton and empty state", async () => {
    mockedListAudit.mockReturnValue(new Promise(() => undefined));
    const { container } = renderWithQuery(<AuditPage />);

    await screen.findByRole("combobox", { name: "Type d’événement" });
    await waitFor(() => {
      expect(container.querySelectorAll(".animate-pulse")).toHaveLength(140);
    });
  });

  it("renders an empty audit feed", async () => {
    mockedListAudit.mockResolvedValue({ count: 0, items: [] });
    renderWithQuery(<AuditPage />);

    expect(await screen.findByText("Journal d’audit vide")).toBeInTheDocument();
  });

  it("shows network errors and can retry", async () => {
    const user = userEvent.setup();
    mockedListAudit
      .mockRejectedValueOnce(new ApiError("Serveur indisponible"))
      .mockResolvedValueOnce(auditFeedFixture);
    renderWithQuery(<AuditPage />);

    expect(await screen.findByText("Serveur indisponible")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(
      await screen.findByRole("button", {
        name: "Voir le détail de Tâche modifiée",
      }),
    ).toBeInTheDocument();
  });

  it("reloads when the workspace changes", async () => {
    const user = userEvent.setup();
    renderWithQuery(<AuditPage />);

    await screen.findByRole("button", {
      name: "Voir le détail de Tâche modifiée",
    });
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Workspace actif" }),
      secondWorkspace.id,
    );

    await waitFor(() => {
      expect(mockedListAudit).toHaveBeenLastCalledWith(secondWorkspace.id, {
        limit: 20,
        offset: 0,
      });
    });
  });
});
