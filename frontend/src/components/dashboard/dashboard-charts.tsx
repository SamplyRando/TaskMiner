import { memo, useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  DashboardPriorityItem,
  DashboardStatusItem,
  DashboardTrendPoint,
  DashboardTrends,
} from "@/types/dashboard";

const statusLabels = {
  done: "Terminées",
  in_progress: "En cours",
  todo: "En attente",
} as const;

const priorityLabels = {
  high: "Haute",
  low: "Basse",
  medium: "Moyenne",
  urgent: "Urgente",
} as const;

const statusColors = {
  done: "#10b981",
  in_progress: "#3b82f6",
  todo: "#94a3b8",
} as const;

type DashboardChartsProps = {
  periodLabel: string;
  priorities: DashboardPriorityItem[];
  statuses: DashboardStatusItem[];
  trends: DashboardTrends;
};

const formatTrend = (trend: DashboardTrendPoint[]) =>
  trend.map((item) => ({
    count: item.count,
    date: new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
    }).format(new Date(`${item.date}T00:00:00Z`)),
  }));

const TrendChart = memo(function TrendChart({
  color,
  description,
  items,
  title,
}: {
  color: string;
  description: string;
  items: DashboardTrendPoint[];
  title: string;
}) {
  const data = useMemo(() => formatTrend(items), [items]);
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-72 min-w-0" aria-label={title} role="img">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={data} margin={{ left: -20, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              fontSize={11}
              minTickGap={20}
              tickLine={false}
            />
            <YAxis allowDecimals={false} fontSize={12} tickLine={false} />
            <Tooltip />
            <Line
              dataKey="count"
              dot={false}
              isAnimationActive={false}
              stroke={color}
              strokeWidth={3}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

export const DashboardCharts = memo(function DashboardCharts({
  periodLabel,
  priorities,
  statuses,
  trends,
}: DashboardChartsProps) {
  const statusData = useMemo(
    () =>
      statuses.map((item) => ({
        fill: statusColors[item.status],
        name: statusLabels[item.status],
        value: item.count,
      })),
    [statuses],
  );
  const priorityData = useMemo(
    () =>
      priorities.map((item) => ({
        count: item.count,
        name: priorityLabels[item.priority],
      })),
    [priorities],
  );

  return (
    <section aria-labelledby="dashboard-charts-title" className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold" id="dashboard-charts-title">
          Évolution temporelle
        </h2>
        <p className="text-muted-foreground text-sm">
          Tendances consolidées sur {periodLabel}.
        </p>
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <TrendChart
          color="#8b5cf6"
          description="Nouvelles tâches par jour."
          items={trends.task_creations}
          title="Création des tâches"
        />
        <TrendChart
          color="#10b981"
          description="Tâches passées au statut terminé."
          items={trends.task_completions}
          title="Tâches terminées"
        />
        <TrendChart
          color="#f59e0b"
          description="Volume quotidien des tâches restant à traiter."
          items={trends.backlog}
          title="Évolution du backlog"
        />
        <TrendChart
          color="#3b82f6"
          description="Nouveaux espaces de travail par jour."
          items={trends.workspace_creations}
          title="Workspaces créés"
        />
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">Répartition des statuts</CardTitle>
            <CardDescription>Part de chaque état.</CardDescription>
          </CardHeader>
          <CardContent className="h-72 min-w-0">
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  innerRadius={52}
                  nameKey="name"
                  outerRadius={82}
                  paddingAngle={3}
                />
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-base">
              Répartition des priorités
            </CardTitle>
            <CardDescription>Tâches par criticité.</CardDescription>
          </CardHeader>
          <CardContent className="h-72 min-w-0">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={priorityData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} />
                <YAxis allowDecimals={false} fontSize={12} tickLine={false} />
                <Tooltip />
                <Bar
                  dataKey="count"
                  fill="#6366f1"
                  isAnimationActive={false}
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </section>
  );
});
