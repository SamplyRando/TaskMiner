import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TrendingUp } from "lucide-react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ActivityList } from "@/components/dashboard/activity-list";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { DistributionOverview } from "@/components/dashboard/distribution-overview";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RecentProjects } from "@/components/dashboard/recent-projects";
import { dashboardFixture } from "@/test/dashboard-fixtures";
import type { DashboardParams } from "@/types/dashboard";

describe("advanced dashboard components", () => {
  it("synchronizes workspace, project, user and period filters", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const project = dashboardFixture.filter_options.projects[0];
    const workspace = dashboardFixture.filter_options.workspaces[0];
    if (!project || !workspace) {
      throw new Error("Dashboard filter fixtures are missing.");
    }
    const filters: DashboardParams = {
      activity_limit: 8,
      period: "30d",
      project_id: project.id,
    };

    const { rerender } = render(
      <DashboardFilters
        filters={filters}
        onChange={onChange}
        options={dashboardFixture.filter_options}
      />,
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filtrer par workspace" }),
      workspace.id,
    );
    expect(onChange).toHaveBeenLastCalledWith({
      activity_limit: 8,
      period: "30d",
      workspace_id: workspace.id,
    });

    rerender(
      <DashboardFilters
        filters={{ activity_limit: 8, period: "30d" }}
        onChange={onChange}
        options={dashboardFixture.filter_options}
      />,
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filtrer par période" }),
      "90d",
    );
    expect(onChange).toHaveBeenLastCalledWith({
      activity_limit: 8,
      period: "90d",
    });
  });

  it("renders detailed distributions and their empty states", () => {
    const { rerender } = render(
      <DistributionOverview
        assignees={dashboardFixture.assignee_distribution}
        events={dashboardFixture.event_distribution}
        projects={dashboardFixture.project_distribution}
      />,
    );

    expect(screen.getByText("Tâches par projet")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Tâches créées")).toBeInTheDocument();

    rerender(<DistributionOverview assignees={[]} events={[]} projects={[]} />);
    expect(screen.getAllByText("Aucune répartition")).toHaveLength(3);
  });

  it("exposes KPI context and the previous-period variation", async () => {
    const user = userEvent.setup();
    render(
      <KpiCard
        color="emerald"
        icon={TrendingUp}
        title="Taux"
        tooltip="Part des tâches terminées."
        value="72%"
        variation={12.5}
      />,
    );

    expect(screen.getByText("+12,5 % vs période précédente")).toBeVisible();
    await user.tab();
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Part des tâches terminées.",
    );
  });

  it("renders actor, relative time, direct link and configurable activity limit", async () => {
    const user = userEvent.setup();
    const onLimitChange = vi.fn();
    render(
      <MemoryRouter>
        <ActivityList
          items={dashboardFixture.recent_activities}
          limit={8}
          onLimitChange={onLimitChange}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Ada Lovelace/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ouvrir la ressource liée/ }),
    ).toHaveAttribute("href", "/app/tasks");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Nombre maximal d’activités" }),
      "12",
    );
    expect(onLimitChange).toHaveBeenCalledWith(12);
  });

  it("delegates project search, sort and pagination to the server", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const onSearchChange = vi.fn();
    const onSortChange = vi.fn();
    render(
      <MemoryRouter>
        <RecentProjects
          items={dashboardFixture.recent_projects}
          serverControls={{
            limit: 5,
            offset: 0,
            onPageChange,
            onSearchChange,
            onSortChange,
            search: "",
            sort: "-created_at",
            total: 12,
          }}
        />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByRole("textbox", {
        name: "Rechercher un projet récent",
      }),
      "mobile",
    );
    expect(onSearchChange).toHaveBeenCalled();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Trier les projets récents" }),
      "-progress",
    );
    expect(onSortChange).toHaveBeenCalledWith("-progress");
    await user.click(screen.getByRole("button", { name: "Page suivante" }));
    expect(onPageChange).toHaveBeenCalledWith(5);
  });

  it("shows a project skeleton while the server page loads", () => {
    render(
      <MemoryRouter>
        <RecentProjects items={[]} loading />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("status", { name: "Chargement des projets récents" }),
    ).toBeInTheDocument();
  });

  it("keeps the analytical project table scrollable on narrow screens", () => {
    const { container } = render(
      <MemoryRouter>
        <RecentProjects
          items={dashboardFixture.recent_projects}
          serverControls={{
            limit: 5,
            offset: 0,
            onPageChange: vi.fn(),
            onSearchChange: vi.fn(),
            onSortChange: vi.fn(),
            search: "",
            sort: "-created_at",
            total: 1,
          }}
        />
      </MemoryRouter>,
    );

    expect(container.querySelector("table")?.parentElement).toHaveClass(
      "overflow-auto",
    );
  });
});
