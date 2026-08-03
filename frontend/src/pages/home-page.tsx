import {
  AlarmClock,
  BarChart3,
  BriefcaseBusiness,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  FolderKanban,
  Gauge,
  ListTodo,
  Timer,
} from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { ActivityList } from "@/components/dashboard/activity-list";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { DistributionOverview } from "@/components/dashboard/distribution-overview";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PriorityDistribution } from "@/components/dashboard/priority-distribution";
import { QuickStats } from "@/components/dashboard/quick-stats";
import { RecentProjects } from "@/components/dashboard/recent-projects";
import { RecentTasks } from "@/components/dashboard/recent-tasks";
import { StatusDistribution } from "@/components/dashboard/status-distribution";
import { ErrorState } from "@/components/error-state";
import { useDashboard, useDashboardProjects } from "@/features/dashboard/hooks";
import { useUserPreferences } from "@/features/settings/hooks";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSessionState } from "@/hooks/use-session-state";
import { useAuthStore } from "@/store/auth-store";
import type {
  DashboardParams,
  DashboardProjectListParams,
  DashboardProjectSort,
} from "@/types/dashboard";

const initialFilters: DashboardParams = {
  activity_limit: 8,
  period: "30d",
};

const periodLabels = {
  "7d": "7 jours",
  "30d": "30 jours",
  "90d": "90 jours",
} as const;

export function HomePage() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const preferences = useUserPreferences();
  const defaultPeriodApplied = useRef(false);
  const [filters, setFilters] = useSessionState<DashboardParams>(
    "taskminer-dashboard-filters",
    initialFilters,
  );
  const [projectSearch, setProjectSearch] = useSessionState(
    "taskminer-dashboard-project-search",
    "",
  );
  const [projectSort, setProjectSort] = useSessionState<DashboardProjectSort>(
    "taskminer-dashboard-project-sort",
    "-created_at",
  );
  const [projectOffset, setProjectOffset] = useSessionState(
    "taskminer-dashboard-project-offset",
    0,
  );

  useEffect(() => {
    if (!preferences.data || defaultPeriodApplied.current) return;
    defaultPeriodApplied.current = true;
    const preferredPeriod = `${String(
      preferences.data.dashboard_period,
    )}d` as DashboardParams["period"];
    setFilters((current) =>
      current.period === preferredPeriod
        ? current
        : { ...current, period: preferredPeriod },
    );
  }, [preferences.data, setFilters]);
  const debouncedProjectSearch = useDebouncedValue(projectSearch);
  const dashboardQuery = useDashboard(filters);
  const dashboard = dashboardQuery.data;
  const projectParams = useMemo<DashboardProjectListParams>(
    () => ({
      limit: 5,
      offset: projectOffset,
      period: filters.period,
      sort: projectSort,
      ...(filters.workspace_id ? { workspace_id: filters.workspace_id } : {}),
      ...(filters.project_id ? { project_id: filters.project_id } : {}),
      ...(filters.user_id ? { user_id: filters.user_id } : {}),
      ...(debouncedProjectSearch ? { search: debouncedProjectSearch } : {}),
    }),
    [
      debouncedProjectSearch,
      filters.period,
      filters.project_id,
      filters.user_id,
      filters.workspace_id,
      projectOffset,
      projectSort,
    ],
  );
  const projectsQuery = useDashboardProjects(projectParams);

  const kpis = useMemo(() => {
    if (!dashboard) {
      return [];
    }

    return [
      {
        color: "violet" as const,
        icon: BriefcaseBusiness,
        title: "Workspaces",
        tooltip: "Espaces de travail actifs dans le périmètre sélectionné.",
        value: dashboard.kpis.workspaces,
        variation: dashboard.kpis.variations.workspaces,
      },
      {
        color: "blue" as const,
        icon: FolderKanban,
        title: "Projets",
        tooltip: "Projets actifs, hors éléments supprimés.",
        value: dashboard.kpis.projects,
        variation: dashboard.kpis.variations.projects,
      },
      {
        color: "violet" as const,
        icon: ListTodo,
        title: "Tâches",
        tooltip: "Toutes les tâches actives correspondant aux filtres.",
        value: dashboard.kpis.tasks,
        variation: dashboard.kpis.variations.tasks,
      },
      {
        color: "emerald" as const,
        icon: CheckCircle2,
        title: "Tâches terminées",
        tooltip: "Tâches actuellement au statut terminé.",
        value: dashboard.kpis.completed,
        variation: dashboard.kpis.variations.completed,
      },
      {
        color: "rose" as const,
        icon: AlarmClock,
        title: "Tâches en retard",
        tooltip: "Tâches non terminées dont l’échéance est dépassée.",
        value: dashboard.kpis.overdue,
        variation: null,
      },
      {
        color: "amber" as const,
        icon: CalendarClock,
        title: "Dues aujourd’hui",
        tooltip: "Tâches non terminées arrivant à échéance aujourd’hui.",
        value: dashboard.kpis.due_today,
        variation: null,
      },
      {
        color: "blue" as const,
        icon: CalendarCheck2,
        title: "Dues cette semaine",
        tooltip: "Tâches non terminées dues avant la fin de la semaine.",
        value: dashboard.kpis.due_this_week,
        variation: null,
      },
      {
        color: "emerald" as const,
        icon: Gauge,
        title: "Taux de complétion",
        tooltip: "Part des tâches actives actuellement terminées.",
        value: `${dashboard.kpis.completion_rate.toLocaleString("fr-FR")}%`,
        variation: dashboard.kpis.variations.completion_rate,
      },
      {
        color: "amber" as const,
        icon: Timer,
        title: "Temps moyen de clôture",
        tooltip:
          "Durée moyenne entre création et dernière clôture des tâches terminées.",
        value: `${dashboard.kpis.average_completion_hours.toLocaleString("fr-FR")} h`,
        variation: dashboard.kpis.variations.average_completion_hours,
      },
      {
        color: "blue" as const,
        icon: BarChart3,
        title: "Tâches par projet",
        tooltip: "Nombre moyen de tâches actives par projet actif.",
        value: dashboard.kpis.average_tasks_per_project.toLocaleString("fr-FR"),
        variation: dashboard.kpis.variations.average_tasks_per_project,
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
      <header className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bonjour{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-muted-foreground mt-1">
            Votre cockpit décisionnel est actualisé automatiquement toutes les
            30 secondes.
          </p>
        </div>
        {dashboardQuery.isFetching ? (
          <p aria-live="polite" className="text-muted-foreground text-xs">
            Actualisation…
          </p>
        ) : null}
      </header>

      <DashboardFilters
        filters={filters}
        onChange={(nextFilters) => {
          setProjectOffset(0);
          setFilters(nextFilters);
        }}
        options={dashboard.filter_options}
      />

      <section
        aria-label="Indicateurs clés"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
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
        periodLabel={periodLabels[filters.period]}
        priorities={dashboard.priority_distribution}
        statuses={dashboard.status_distribution}
        trends={dashboard.trends}
      />

      <DistributionOverview
        assignees={dashboard.assignee_distribution}
        events={dashboard.event_distribution}
        projects={dashboard.project_distribution}
      />

      <QuickStats stats={dashboard.quick_stats} />

      <section className="grid min-w-0 gap-4 xl:grid-cols-2">
        <ActivityList
          items={dashboard.recent_activities}
          limit={filters.activity_limit}
          onLimitChange={(activityLimit) => {
            setFilters((current) => ({
              ...current,
              activity_limit: activityLimit,
            }));
          }}
        />
        {projectsQuery.isError ? (
          <ErrorState
            error={projectsQuery.error}
            onRetry={() => void projectsQuery.refetch()}
          />
        ) : (
          <RecentProjects
            items={projectsQuery.data?.items ?? []}
            loading={projectsQuery.isPending}
            serverControls={{
              limit: projectParams.limit,
              offset: projectParams.offset,
              onPageChange: setProjectOffset,
              onSearchChange: (search) => {
                setProjectOffset(0);
                setProjectSearch(search);
              },
              onSortChange: (sort) => {
                setProjectOffset(0);
                setProjectSort(sort);
              },
              search: projectSearch,
              sort: projectSort,
              total: projectsQuery.data?.total ?? 0,
            }}
          />
        )}
      </section>

      <RecentTasks
        description="Les dix dernières tâches créées dans vos projets."
        emptyDescription="Créez une tâche depuis un projet pour la retrouver ici."
        emptyTitle="Aucune tâche récente"
        items={dashboard.recent_tasks}
        title="Tâches récentes"
      />

      {currentUser ? (
        <RecentTasks
          description="Vos tâches assignées, triées par urgence puis par échéance."
          emptyDescription="Aucune tâche active ne vous est assignée."
          emptyTitle="Vous êtes à jour"
          items={dashboard.my_tasks}
          title="Mes tâches"
        />
      ) : null}
    </div>
  );
}
