import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/api/client";
import { getDashboard, getDashboardProjects } from "@/api/dashboard";
import { getUserPreferences } from "@/api/settings";
import { HomePage } from "@/pages/home-page";
import { authenticateStore, resetAuthStore } from "@/test/auth-fixtures";
import {
  dashboardFixture,
  emptyDashboardFixture,
} from "@/test/dashboard-fixtures";
import { renderWithQuery } from "@/test/query-wrapper";

vi.mock("@/api/dashboard", () => ({
  getDashboard: vi.fn(),
  getDashboardProjects: vi.fn(),
}));
vi.mock("@/api/settings", () => ({ getUserPreferences: vi.fn() }));

vi.mock("@/components/dashboard/dashboard-charts", () => ({
  DashboardCharts: () => <div>Graphiques analytiques</div>,
}));

const mockedGetDashboard = vi.mocked(getDashboard);
const mockedGetDashboardProjects = vi.mocked(getDashboardProjects);
const mockedGetPreferences = vi.mocked(getUserPreferences);

const renderPage = () =>
  renderWithQuery(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );

describe("HomePage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetAuthStore();
    mockedGetPreferences.mockResolvedValue({
      accent: "violet",
      dashboard_period: 30,
      items_per_page: 20,
      motion: "full",
      notify_activity_feed: true,
      notify_assignments: true,
      notify_audit: true,
      notify_comments: true,
      notify_invitations: true,
      theme: "system",
    });
    mockedGetDashboardProjects.mockResolvedValue({
      items: dashboardFixture.recent_projects,
      limit: 5,
      offset: 0,
      total: dashboardFixture.recent_projects.length,
    });
  });

  it("renders the complete authenticated dashboard", async () => {
    authenticateStore();
    mockedGetDashboard.mockResolvedValue(dashboardFixture);

    renderPage();

    expect(await screen.findByText("Bonjour, Ada")).toBeInTheDocument();
    expect(screen.getByText("Workspaces")).toBeInTheDocument();
    expect(screen.getByText("Taux de complétion")).toBeInTheDocument();
    expect(screen.getByText("Graphiques analytiques")).toBeInTheDocument();
    expect(screen.getByText("Dernières activités")).toBeInTheDocument();
    expect(screen.getByText("Projets récents")).toBeInTheDocument();
    expect(screen.getByText("Tâches récentes")).toBeInTheDocument();
    expect(screen.getByText("Mes tâches")).toBeInTheDocument();
  });

  it("shows a skeleton while the dashboard is loading", () => {
    mockedGetDashboard.mockReturnValue(new Promise(() => undefined));

    renderPage();

    expect(
      screen.getByRole("status", { name: "Chargement du dashboard" }),
    ).toBeInTheDocument();
  });

  it("shows the API error and retries the request", async () => {
    mockedGetDashboard
      .mockRejectedValueOnce(new ApiError("Dashboard indisponible", 503))
      .mockResolvedValueOnce(dashboardFixture);

    renderPage();

    expect(
      await screen.findByText("Dashboard indisponible"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(await screen.findByText("Bonjour")).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedGetDashboard).toHaveBeenCalledTimes(2);
    });
  });

  it("renders empty states when no dashboard resources exist", async () => {
    authenticateStore();
    mockedGetDashboard.mockResolvedValue(emptyDashboardFixture);
    mockedGetDashboardProjects.mockResolvedValue({
      items: [],
      limit: 5,
      offset: 0,
      total: 0,
    });

    renderPage();

    expect(await screen.findByText("Aucune activité")).toBeInTheDocument();
    expect(screen.getByText("Aucun projet")).toBeInTheDocument();
    expect(screen.getByText("Aucune tâche récente")).toBeInTheDocument();
    expect(screen.getByText("Vous êtes à jour")).toBeInTheDocument();
  });

  it("hides the assigned tasks section without a current profile", async () => {
    mockedGetDashboard.mockResolvedValue(dashboardFixture);

    renderPage();

    expect(await screen.findByText("Bonjour")).toBeInTheDocument();
    expect(screen.queryByText("Mes tâches")).not.toBeInTheDocument();
  });

  it("reloads every widget when a global period filter changes", async () => {
    const user = userEvent.setup();
    authenticateStore();
    mockedGetDashboard.mockResolvedValue(dashboardFixture);

    renderPage();
    await screen.findByText("Bonjour, Ada");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filtrer par période" }),
      "7d",
    );

    await waitFor(() => {
      expect(mockedGetDashboard).toHaveBeenLastCalledWith({
        activity_limit: 8,
        period: "7d",
      });
    });
  });
});
