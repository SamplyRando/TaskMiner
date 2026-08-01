import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listWorkspaceActivities } from "@/api/activities";
import { ApiError } from "@/api/client";
import { listWorkspaces } from "@/api/workspace";
import { ActivityPage } from "@/pages/activity-page";
import { useWorkspaceStore } from "@/store/workspace-store";
import {
  activityFeedFixture,
  activityFixture,
  firstWorkspace,
  secondWorkspace,
} from "@/test/activity-fixtures";
import { renderWithQuery } from "@/test/query-wrapper";

vi.mock("@/api/activities", () => ({
  listWorkspaceActivities: vi.fn(),
}));

vi.mock("@/api/workspace", () => ({
  createWorkspace: vi.fn(),
  deleteWorkspace: vi.fn(),
  listWorkspaces: vi.fn(),
  updateWorkspace: vi.fn(),
}));

const mockedListActivities = vi.mocked(listWorkspaceActivities);
const mockedListWorkspaces = vi.mocked(listWorkspaces);

describe("ActivityPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    useWorkspaceStore.setState({ activeWorkspaceId: null });
    mockedListWorkspaces.mockResolvedValue([firstWorkspace, secondWorkspace]);
    mockedListActivities.mockResolvedValue(activityFeedFixture);
  });

  it("loads and renders real workspace activities", async () => {
    renderWithQuery(<ActivityPage />);

    expect(await screen.findByText("Tâche créée")).toBeInTheDocument();
    expect(
      screen.getByText("Préparer la mise en production"),
    ).toBeInTheDocument();
    expect(mockedListActivities).toHaveBeenCalledWith(firstWorkspace.id, {
      limit: 20,
      offset: 0,
    });
  });

  it("shows the loading skeleton and empty state", async () => {
    mockedListActivities.mockReturnValue(new Promise(() => undefined));
    renderWithQuery(<ActivityPage />);

    expect(
      await screen.findByRole("status", { name: "Chargement des activités" }),
    ).toBeInTheDocument();
  });

  it("renders an empty feed", async () => {
    mockedListActivities.mockResolvedValue({ count: 0, items: [] });
    renderWithQuery(<ActivityPage />);

    expect(await screen.findByText("Aucune activité")).toBeInTheDocument();
    expect(screen.getByText("0 activité")).toBeInTheDocument();
  });

  it("shows an API error and retries", async () => {
    const user = userEvent.setup();
    mockedListActivities
      .mockRejectedValueOnce(new ApiError("Flux indisponible", 503))
      .mockResolvedValueOnce(activityFeedFixture);
    renderWithQuery(<ActivityPage />);

    expect(await screen.findByText("Flux indisponible")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(await screen.findByText("Tâche créée")).toBeInTheDocument();
    expect(mockedListActivities).toHaveBeenCalledTimes(2);
  });

  it("paginates with backend offset and limit", async () => {
    const user = userEvent.setup();
    mockedListActivities.mockResolvedValue({
      count: 21,
      items: [activityFixture],
    });
    renderWithQuery(<ActivityPage />);

    await screen.findByText("Tâche créée");
    await user.click(screen.getByRole("button", { name: "Page suivante" }));

    await waitFor(() => {
      expect(mockedListActivities).toHaveBeenLastCalledWith(firstWorkspace.id, {
        limit: 20,
        offset: 20,
      });
    });
  });

  it("reloads the feed when the active workspace changes", async () => {
    const user = userEvent.setup();
    renderWithQuery(<ActivityPage />);

    await screen.findByText("Tâche créée");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Workspace actif" }),
      secondWorkspace.id,
    );

    await waitFor(() => {
      expect(mockedListActivities).toHaveBeenLastCalledWith(
        secondWorkspace.id,
        { limit: 20, offset: 0 },
      );
    });
  });
});
