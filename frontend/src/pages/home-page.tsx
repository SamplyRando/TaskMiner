import {
  BriefcaseBusiness,
  CheckCircle2,
  CircleDashed,
  Clock3,
  FolderKanban,
  Gauge,
  ListTodo,
  Siren,
} from "lucide-react";
import { useMemo } from "react";

import { ActivityList } from "@/components/dashboard/activity-list";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PriorityDistribution } from "@/components/dashboard/priority-distribution";
import { QuickStats } from "@/components/dashboard/quick-stats";
import { RecentProjects } from "@/components/dashboard/recent-projects";
import { RecentTasks } from "@/components/dashboard/recent-tasks";
import { StatusDistribution } from "@/components/dashboard/status-distribution";
import { ErrorState } from "@/components/error-state";
import { useDashboard } from "@/features/dashboard/hooks";
import { useAuthStore } from "@/store/auth-store";

export function HomePage() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const dashboardQuery = useDashboard();
  const dashboard = dashboardQuery.data;

  const kpis = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    return [
      {
        color: "violet" as const,
        icon: BriefcaseBusiness,
        title: "Workspaces",
        value: dashboard.kpis.workspaces,
      },
      {
        color: "blue" as const,
        icon: FolderKanban,
        title: "Projets",
        value: dashboard.kpis.projects,
      },
      {
        color: "violet" as const,
        icon: ListTodo,
        title: "Tâches",
        value: dashboard.kpis.tasks,
      },
      {
        color: "emerald" as const,
        icon: CheckCircle2,
        title: "Terminées",
        value: dashboard.kpis.completed,
      },
      {
        color: "blue" as const,
        icon: Clock3,
        title: "En cours",
        value: dashboard.kpis.in_progress,
      },
      {
        color: "amber" as const,
        icon: CircleDashed,
        title: "En attente",
        value: dashboard.kpis.pending,
      },
      {
        color: "rose" as const,
        icon: Siren,
        title: "Urgentes",
        value: dashboard.kpis.urgent,
      },
      {
        color: "emerald" as const,
        icon: Gauge,
        title: "Taux de complétion",
        value: `${dashboard.kpis.completion_rate.toLocaleString("fr-FR")}%`,
      },
    ];
  }, [dashboard]);

  if (dashboardQuery.isError) {
    return (
      <ErrorState
        error={dashboardQuery.error}
        onRetry={() => void dashboardQuery.refetch()}
      />
    );
  }

  if (!dashboard) {
    return <DashboardSkeleton />;
  }

  const firstName = currentUser?.full_name?.trim().split(/\s+/)[0];

  return (
    <div className="min-w-0 space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          Bonjour{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-muted-foreground mt-1">
          Voici l’état de vos workspaces et de vos tâches aujourd’hui.
        </p>
      </header>

      <section
        aria-label="Indicateurs clés"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {kpis.map((kpi) => (
          <KpiCard {...kpi} key={kpi.title} />
        ))}
      </section>

      <section className="grid min-w-0 gap-4 lg:grid-cols-2">
        <StatusDistribution items={dashboard.status_distribution} />
        <PriorityDistribution items={dashboard.priority_distribution} />
      </section>

      <DashboardCharts
        priorities={dashboard.priority_distribution}
        statuses={dashboard.status_distribution}
        trend={dashboard.task_creation_trend}
      />

      <QuickStats stats={dashboard.quick_stats} />

      <section className="grid min-w-0 gap-4 xl:grid-cols-2">
        <ActivityList items={dashboard.recent_activities} />
        <RecentProjects items={dashboard.recent_projects} />
      </section>

      <RecentTasks
        description="Les cinq dernières tâches créées dans vos projets."
        emptyDescription="Créez une tâche depuis un projet pour la retrouver ici."
        emptyTitle="Aucune tâche récente"
        items={dashboard.recent_tasks}
        title="Tâches récentes"
      />

      {currentUser ? (
        <RecentTasks
          description="Tâches qui vous sont actuellement assignées."
          emptyDescription="Aucune tâche active ne vous est assignée."
          emptyTitle="Vous êtes à jour"
          items={dashboard.my_tasks}
          title="Mes tâches"
        />
      ) : null}
    </div>
  );
}
