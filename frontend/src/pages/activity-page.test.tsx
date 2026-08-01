import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  connectActivityStream,
  listWorkspaceActivities,
} from "@/api/activities";
import { ApiError } from "@/api/client";
import { listWorkspaces } from "@/api/workspace";
import { ActivityPage } from "@/pages/activity-page";
import { useWorkspaceStore } from "@/store/workspace-store";
import { authenticateStore, resetAuthStore } from "@/test/auth-fixtures";
import {
  activityFeedFixture,
  activityFixture,
  firstWorkspace,
  secondWorkspace,
} from "@/test/activity-fixtures";
import { renderWithQuery } from "@/test/query-wrapper";

vi.mock("@/api/activities", () => ({
  connectActivityStream: vi.fn(),
  listWorkspaceActivities: vi.fn(),
}));

vi.mock("@/api/workspace", () => ({
  createWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  listWorkspaces: vi.fn(),
  updateWorkspace: vi.fn(),
}));

const mockedConnectStream = vi.mocked(connectActivityStream);
const mockedListActivities = vi.mocked(listWorkspaceActivities);
const mockedListWorkspaces = vi.mocked(listWorkspaces);

const createActivityPage = (count: number) => ({
  count,
  items: Array.from({ length: Math.min(count, 20) }, (_, index) => ({
    ...activityFixture,
    id: `activity-${String(index)}`,
    message: `Activité ${String(index)}`,
  })),
});

describe("ActivityPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    resetAuthStore();
    authenticateStore();
    useWorkspaceStore.setState({ activeWorkspaceId: null });
    mockedListWorkspaces.mockResolvedValue([firstWorkspace, secondWorkspace]);
    mockedListActivities.mockResolvedValue(activityFeedFixture);
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

  it("loads history and opens the live workspace stream", async () => {
    renderWithQuery(<ActivityPage />);

    expect(
      await screen.findByText("Tâche créée : Préparer la mise en production"),
    ).toBeInTheDocument();
    expect(await screen.findByText("En direct")).toBeInTheDocument();
    expect(mockedListActivities).toHaveBeenCalledWith(firstWorkspace.id, {
      limit: 20,
      offset: 0,
    });
    expect(mockedConnectStream).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: firstWorkspace.id }),
    );
  });

  it("inserts a streamed event immediately at the top", async () => {
    let pushActivity: ((activity: typeof activityFixture) => void) | undefined;
    mockedConnectStream.mockImplementation(async (options) => {
      options.onOpen();
      pushActivity = options.onActivity;
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
    renderWithQuery(<ActivityPage />);
    await screen.findByText("Tâche créée : Préparer la mise en production");
    const liveActivity = {
      ...activityFixture,
      id: "live-activity",
      message: "Projet créé : Mission temps réel",
    };

    act(() => {
      pushActivity?.(liveActivity);
    });

    expect(
      await screen.findByText("Projet créé : Mission temps réel"),
    ).toBeInTheDocument();
    expect(screen.getByText("2 activités")).toBeInTheDocument();
    expect(
      screen.getByText("Nouvelle activité reçue en temps réel."),
    ).toBeInTheDocument();
  });

  it("shows loading and empty states", async () => {
    mockedListActivities.mockReturnValue(new Promise(() => undefined));
    const { unmount } = renderWithQuery(<ActivityPage />);

    expect(
      await screen.findByRole("status", { name: "Chargement des activités" }),
    ).toBeInTheDocument();
    unmount();

    mockedListActivities.mockResolvedValue({ count: 0, items: [] });
    renderWithQuery(<ActivityPage />);
    expect(await screen.findByText("Aucune activité")).toBeInTheDocument();
    expect(screen.getByText("0 activité")).toBeInTheDocument();
  });

  it("shows an API error and retries history", async () => {
    const user = userEvent.setup();
    mockedListActivities
      .mockRejectedValueOnce(new ApiError("Flux indisponible", 503))
      .mockResolvedValueOnce(activityFeedFixture);
    renderWithQuery(<ActivityPage />);

    expect(await screen.findByText("Flux indisponible")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(
      await screen.findByText("Tâche créée : Préparer la mise en production"),
    ).toBeInTheDocument();
  });

  it("applies user, event, and period filters without navigation", async () => {
    const user = userEvent.setup();
    renderWithQuery(<ActivityPage />);
    await screen.findByText("Tâche créée : Préparer la mise en production");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Utilisateur" }),
      activityFixture.actor?.id ?? "",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Type d’événement" }),
      "task_created",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Période" }),
      "week",
    );

    await waitFor(() => {
      expect(mockedListActivities).toHaveBeenLastCalledWith(firstWorkspace.id, {
        actor_id: activityFixture.actor?.id,
        event_type: "task_created",
        limit: 20,
        offset: 0,
        period: "week",
      });
    });
  });

  it("debounces full-text search", async () => {
    const user = userEvent.setup();
    renderWithQuery(<ActivityPage />);
    await screen.findByText("Tâche créée : Préparer la mise en production");

    await user.type(
      screen.getByRole("searchbox", {
        name: "Rechercher dans les activités",
      }),
      "dashboard",
    );

    await waitFor(() => {
      expect(mockedListActivities).toHaveBeenLastCalledWith(firstWorkspace.id, {
        limit: 20,
        offset: 0,
        search: "dashboard",
      });
    });
  });

  it("loads the next server page from virtual scroll", async () => {
    mockedListActivities
      .mockResolvedValueOnce(createActivityPage(21))
      .mockResolvedValueOnce({
        count: 21,
        items: [{ ...activityFixture, id: "activity-20" }],
      });
    renderWithQuery(<ActivityPage />);
    await screen.findByText("Activité 0");
    const viewport = screen.getByRole("region", {
      name: "Flux d’activités virtualisé",
    });
    Object.defineProperties(viewport, {
      clientHeight: { configurable: true, value: 640 },
      scrollHeight: { configurable: true, value: 3360 },
      scrollTop: { configurable: true, value: 2800, writable: true },
    });

    fireEvent.scroll(viewport);

    await waitFor(() => {
      expect(mockedListActivities).toHaveBeenLastCalledWith(firstWorkspace.id, {
        limit: 20,
        offset: 20,
      });
    });
  });

  it("reloads history and SSE when the active workspace changes", async () => {
    const user = userEvent.setup();
    renderWithQuery(<ActivityPage />);
    await screen.findByText("Tâche créée : Préparer la mise en production");

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Workspace actif" }),
      secondWorkspace.id,
    );

    await waitFor(() => {
      expect(mockedListActivities).toHaveBeenLastCalledWith(
        secondWorkspace.id,
        {
          limit: 20,
          offset: 0,
        },
      );
      expect(mockedConnectStream).toHaveBeenLastCalledWith(
        expect.objectContaining({ workspaceId: secondWorkspace.id }),
      );
    });
  });

  it("renders the no-workspace state without opening SSE", async () => {
    mockedListWorkspaces.mockResolvedValue([]);
    renderWithQuery(<ActivityPage />);

    expect(await screen.findByText("Aucun workspace")).toBeInTheDocument();
    expect(mockedConnectStream).not.toHaveBeenCalled();
  });
});
