import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckCircle2 } from "lucide-react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { ActivityList } from "@/components/dashboard/activity-list";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PriorityDistribution } from "@/components/dashboard/priority-distribution";
import { QuickStats } from "@/components/dashboard/quick-stats";
import { RecentProjects } from "@/components/dashboard/recent-projects";
import { RecentTasks } from "@/components/dashboard/recent-tasks";
import { StatusDistribution } from "@/components/dashboard/status-distribution";
import { EmptyState } from "@/components/empty-state";
import { Progress } from "@/components/ui/progress";
import {
  dashboardFixture,
  emptyDashboardFixture,
} from "@/test/dashboard-fixtures";

const renderInRouter = (component: ReactNode) =>
  render(<MemoryRouter>{component}</MemoryRouter>);

describe("dashboard components", () => {
  it("renders a KPI card", () => {
    render(
      <KpiCard
        color="emerald"
        icon={CheckCircle2}
        title="Tâches terminées"
        tooltip="Tâches au statut terminé."
        value={12}
      />,
    );

    expect(screen.getByText("Tâches terminées")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("renders status progress bars with accessible percentages", () => {
    render(<StatusDistribution items={dashboardFixture.status_distribution} />);

    expect(screen.getByText("En attente")).toBeInTheDocument();
    expect(screen.getByText("En cours")).toBeInTheDocument();
    expect(screen.getByText("Terminées")).toBeInTheDocument();
    expect(screen.getAllByRole("progressbar")).toHaveLength(3);
  });

  it("renders every priority counter", () => {
    render(
      <PriorityDistribution items={dashboardFixture.priority_distribution} />,
    );

    for (const label of ["Basse", "Moyenne", "Haute", "Urgente"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders activity details and the empty state", () => {
    const baseActivity = dashboardFixture.recent_activities[0];
    if (!baseActivity) {
      throw new Error("The dashboard activity fixture is missing.");
    }

    const activities = [
      baseActivity,
      {
        ...baseActivity,
        event: "attachment_uploaded" as const,
        id: "activity-filename",
        message: "Pièce jointe ajoutée : rapport.pdf",
        metadata: { filename: "rapport.pdf" },
      },
      {
        ...baseActivity,
        event: "invitation_created" as const,
        id: "activity-email",
        message: "Invitation créée : member@example.com",
        metadata: { email: "member@example.com" },
      },
      {
        ...baseActivity,
        event: "workspace_updated" as const,
        id: "activity-workspace",
        message: "Workspace modifié",
        metadata: {},
      },
    ];
    const { rerender } = renderInRouter(<ActivityList items={activities} />);

    expect(screen.getByText(/Préparer la livraison/)).toBeInTheDocument();
    expect(screen.getByText(/rapport.pdf/)).toBeInTheDocument();
    expect(screen.getByText(/member@example.com/)).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <ActivityList items={[]} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Aucune activité")).toBeInTheDocument();
  });

  it("renders recent projects and their empty state", () => {
    const { rerender } = renderInRouter(
      <RecentProjects items={dashboardFixture.recent_projects} />,
    );

    expect(screen.getByText("Application mobile")).toBeInTheDocument();
    expect(screen.getByText("Produit")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Ouvrir le projet Application mobile" }),
    ).toHaveAttribute("href", "/app/projects");

    rerender(
      <MemoryRouter>
        <RecentProjects items={[]} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Aucun projet")).toBeInTheDocument();
  });

  it("searches, sorts and paginates recent projects", async () => {
    const user = userEvent.setup();
    const baseProject = dashboardFixture.recent_projects[0];
    if (!baseProject) {
      throw new Error("The dashboard project fixture is missing.");
    }
    const projects = ["Zulu", "Echo", "Delta", "Charlie", "Bravo", "Alpha"].map(
      (name, index) => ({
        ...baseProject,
        id: `project-${String(index)}`,
        name,
      }),
    );

    renderInRouter(<RecentProjects items={projects} />);

    expect(screen.getByText("Zulu")).toBeInTheDocument();
    expect(screen.queryByText("Alpha")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Page suivante" }));
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Page précédente" }));

    await user.click(screen.getByRole("button", { name: "Nom" }));
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Zulu")).not.toBeInTheDocument();

    await user.type(
      screen.getByRole("textbox", { name: "Rechercher un projet récent" }),
      "introuvable",
    );
    expect(
      screen.getByText("Aucun résultat pour cette recherche."),
    ).toBeInTheDocument();
    expect(screen.getByText("0 résultat")).toBeInTheDocument();
  });

  it("renders recent tasks, labels and empty state", () => {
    const baseTask = dashboardFixture.recent_tasks[0];
    if (!baseTask) {
      throw new Error("The dashboard task fixture is missing.");
    }

    const secondTask = {
      ...baseTask,
      assigned_user: null,
      assigned_user_id: null,
      id: "task-done",
      priority: "low" as const,
      status: "done" as const,
      title: "Archiver le sprint",
    };
    const items = [baseTask, secondTask];
    const { rerender } = renderInRouter(
      <RecentTasks
        description="Description"
        emptyDescription="Vide"
        emptyTitle="Aucune tâche"
        items={items}
        title="Tâches récentes"
      />,
    );

    expect(screen.getByText("Urgente")).toBeInTheDocument();
    expect(screen.getByText("Terminée")).toBeInTheDocument();
    expect(screen.getByText("Non assignée")).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <RecentTasks
          description="Description"
          emptyDescription="Vide"
          emptyTitle="Aucune tâche"
          items={[]}
          title="Tâches récentes"
        />
      </MemoryRouter>,
    );
    expect(screen.getByText("Aucune tâche")).toBeInTheDocument();
  });

  it("renders quick statistics for all periods", () => {
    render(<QuickStats stats={dashboardFixture.quick_stats} />);

    expect(screen.getByText("Aujourd’hui")).toBeInTheDocument();
    expect(screen.getByText("Cette semaine")).toBeInTheDocument();
    expect(screen.getByText("Ce mois")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();
  });

  it("renders loading, generic empty and bounded progress states", () => {
    const { rerender } = render(<DashboardSkeleton />);
    expect(
      screen.getByRole("status", { name: "Chargement du dashboard" }),
    ).toBeInTheDocument();

    rerender(<EmptyState description="Rien à afficher" title="Vide" />);
    expect(screen.getByText("Vide")).toBeInTheDocument();

    rerender(<Progress aria-label="Progression" value={120} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );

    rerender(<Progress aria-label="Progression" value={-10} />);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
    expect(emptyDashboardFixture.kpis.tasks).toBe(0);
  });
});
