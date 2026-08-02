import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { connectAuditStream, listWorkspaceAudit } from "@/api/audit";
import { ApiError } from "@/api/client";
import { listWorkspaces } from "@/api/workspace";
import { AuditPage } from "@/pages/audit-page";
import { useWorkspaceStore } from "@/store/workspace-store";
import { authenticateStore, resetAuthStore } from "@/test/auth-fixtures";
import {
  auditFeedFixture,
  auditLogFixture,
  firstWorkspace,
  secondWorkspace,
} from "@/test/activity-fixtures";
import { renderWithQuery } from "@/test/query-wrapper";

vi.mock("@/api/audit", () => ({
  connectAuditStream: vi.fn(),
  listWorkspaceAudit: vi.fn(),
}));

vi.mock("@/api/workspace", () => ({
  createWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  listWorkspaces: vi.fn(),
  updateWorkspace: vi.fn(),
}));

const mockedConnectStream = vi.mocked(connectAuditStream);
const mockedListAudit = vi.mocked(listWorkspaceAudit);
const mockedListWorkspaces = vi.mocked(listWorkspaces);

const createAuditPage = (count: number) => ({
  count,
  items: Array.from({ length: Math.min(count, 20) }, (_, index) => ({
    ...auditLogFixture,
    id: `audit-${String(index)}`,
    message: `Audit ${String(index)}`,
  })),
});

describe("AuditPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    resetAuthStore();
    authenticateStore();
    useWorkspaceStore.setState({ activeWorkspaceId: null });
    mockedListWorkspaces.mockResolvedValue([firstWorkspace, secondWorkspace]);
    mockedListAudit.mockResolvedValue(auditFeedFixture);
    mockedConnectStream.mockImplementation(async (options) => {
      options.onOpen();
      await new Promise<void>((resolve) => {
        options.signal.addEventListener(
          "abort",
          () => {
            resolve();
          },
          { once: true },
        );
      });
    });
  });

  it("loads history, opens details and connects live", async () => {
    const user = userEvent.setup();
    renderWithQuery(<AuditPage />);

    expect(
      await screen.findByText(auditLogFixture.message),
    ).toBeInTheDocument();
    expect(await screen.findByText("En direct")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: `Voir le détail de ${auditLogFixture.message}`,
      }),
    );
    expect(
      screen.getByRole("dialog", { name: auditLogFixture.message }),
    ).toBeInTheDocument();
    expect(mockedListAudit).toHaveBeenCalledWith(firstWorkspace.id, {
      limit: 20,
      offset: 0,
    });
    expect(mockedConnectStream).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: firstWorkspace.id }),
    );
  });

  it("inserts a streamed audit immediately without duplicates", async () => {
    let pushAudit: ((auditLog: typeof auditLogFixture) => void) | undefined;
    mockedConnectStream.mockImplementation(async (options) => {
      options.onOpen();
      pushAudit = options.onAudit;
      await new Promise<void>((resolve) => {
        options.signal.addEventListener(
          "abort",
          () => {
            resolve();
          },
          { once: true },
        );
      });
    });
    renderWithQuery(<AuditPage />);
    await screen.findByText(auditLogFixture.message);
    const liveAudit = {
      ...auditLogFixture,
      id: "live-audit",
      message: "Permission modifiée en direct",
    };

    act(() => {
      pushAudit?.(liveAudit);
      pushAudit?.(liveAudit);
    });

    expect(
      await screen.findByText("Permission modifiée en direct"),
    ).toBeInTheDocument();
    expect(screen.getByText("2 entrées")).toBeInTheDocument();
    expect(
      screen.getByText("Nouvelle entrée d’audit reçue en temps réel."),
    ).toBeInTheDocument();
  });

  it("renders loading and empty states", async () => {
    mockedListAudit.mockReturnValue(new Promise(() => undefined));
    const { unmount } = renderWithQuery(<AuditPage />);
    expect(
      await screen.findByLabelText("Chargement du journal d’audit"),
    ).toBeInTheDocument();
    unmount();

    mockedListAudit.mockResolvedValue({ count: 0, items: [] });
    renderWithQuery(<AuditPage />);
    expect(await screen.findByText("Journal d’audit vide")).toBeInTheDocument();
    expect(screen.getByText("0 entrée")).toBeInTheDocument();
  });

  it("shows network errors and retries", async () => {
    const user = userEvent.setup();
    mockedListAudit
      .mockRejectedValueOnce(new ApiError("Audit indisponible", 503))
      .mockResolvedValueOnce(auditFeedFixture);
    renderWithQuery(<AuditPage />);

    expect(await screen.findByText("Audit indisponible")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(
      await screen.findByText(auditLogFixture.message),
    ).toBeInTheDocument();
  });

  it("renders dedicated 403 and 404 states", async () => {
    mockedListAudit.mockRejectedValue(new ApiError("Forbidden", 403));
    const { unmount } = renderWithQuery(<AuditPage />);
    expect(
      await screen.findByText("Accès à l’audit restreint"),
    ).toBeInTheDocument();
    unmount();

    mockedListAudit.mockRejectedValue(new ApiError("Not found", 404));
    renderWithQuery(<AuditPage />);
    expect(
      await screen.findByText("Workspace introuvable"),
    ).toBeInTheDocument();
  });

  it("combines user, type, entity, period and result filters", async () => {
    const user = userEvent.setup();
    renderWithQuery(<AuditPage />);
    await screen.findByText(auditLogFixture.message);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Utilisateur" }),
      auditLogFixture.actor?.id ?? "",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Type" }),
      "task_updated",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Entité" }),
      "task",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Période" }),
      "week",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Résultat" }),
      "true",
    );

    await waitFor(() => {
      expect(mockedListAudit).toHaveBeenLastCalledWith(firstWorkspace.id, {
        actor_id: auditLogFixture.actor?.id,
        event_type: "task_updated",
        limit: 20,
        offset: 0,
        period: "week",
        resource_type: "task",
        success: true,
      });
    });
  });

  it("debounces full-text search", async () => {
    const user = userEvent.setup();
    renderWithQuery(<AuditPage />);
    await screen.findByText(auditLogFixture.message);

    await user.type(
      screen.getByRole("searchbox", {
        name: "Rechercher dans le journal d’audit",
      }),
      "roadmap",
    );

    await waitFor(() => {
      expect(mockedListAudit).toHaveBeenLastCalledWith(firstWorkspace.id, {
        limit: 20,
        offset: 0,
        search: "roadmap",
      });
    });
  });

  it("loads the next server page from virtual scroll", async () => {
    mockedListAudit
      .mockResolvedValueOnce(createAuditPage(21))
      .mockResolvedValueOnce({
        count: 21,
        items: [{ ...auditLogFixture, id: "audit-20" }],
      });
    renderWithQuery(<AuditPage />);
    await screen.findByText("Audit 0");
    const viewport = screen.getByRole("region", {
      name: "Journal d’audit virtualisé",
    });
    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 680 },
      scrollHeight: { configurable: true, value: 5200 },
      scrollTop: { configurable: true, value: 4700, writable: true },
    });

    fireEvent.scroll(viewport);

    await waitFor(() => {
      expect(mockedListAudit).toHaveBeenLastCalledWith(firstWorkspace.id, {
        limit: 20,
        offset: 20,
      });
    });
  });

  it("reloads history and SSE when the workspace changes", async () => {
    const user = userEvent.setup();
    renderWithQuery(<AuditPage />);
    await screen.findByText(auditLogFixture.message);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Workspace actif" }),
      secondWorkspace.id,
    );

    await waitFor(() => {
      expect(mockedListAudit).toHaveBeenLastCalledWith(secondWorkspace.id, {
        limit: 20,
        offset: 0,
      });
      expect(mockedConnectStream).toHaveBeenLastCalledWith(
        expect.objectContaining({ workspaceId: secondWorkspace.id }),
      );
    });
  });

  it("renders the no-workspace state without opening SSE", async () => {
    mockedListWorkspaces.mockResolvedValue([]);
    renderWithQuery(<AuditPage />);

    expect(await screen.findByText("Aucun workspace")).toBeInTheDocument();
    expect(mockedConnectStream).not.toHaveBeenCalled();
  });
});
