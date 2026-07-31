import { CalendarDays } from "lucide-react";
import { memo } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  DashboardPeriodStats,
  DashboardQuickStats,
} from "@/types/dashboard";

const periods: { key: keyof DashboardQuickStats; label: string }[] = [
  { key: "today", label: "Aujourd’hui" },
  { key: "week", label: "Cette semaine" },
  { key: "month", label: "Ce mois" },
];

const PeriodCard = ({
  label,
  stats,
}: {
  label: string;
  stats: DashboardPeriodStats;
}) => (
  <div className="bg-muted/40 rounded-lg border p-4">
    <div className="flex items-center gap-2">
      <CalendarDays aria-hidden="true" className="text-primary size-4" />
      <h3 className="font-medium">{label}</h3>
    </div>
    <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
      <div>
        <dt className="text-muted-foreground text-xs">Créées</dt>
        <dd className="mt-1 text-xl font-bold">{stats.created}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground text-xs">Terminées</dt>
        <dd className="mt-1 text-xl font-bold">{stats.completed}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground text-xs">Taux</dt>
        <dd className="mt-1 text-xl font-bold">
          {stats.completion_rate.toLocaleString("fr-FR")}%
        </dd>
      </div>
    </dl>
  </div>
);

type QuickStatsProps = {
  stats: DashboardQuickStats;
};

export const QuickStats = memo(function QuickStats({ stats }: QuickStatsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Statistiques rapides</CardTitle>
        <CardDescription>Activité sur les périodes en cours.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        {periods.map((period) => (
          <PeriodCard
            key={period.key}
            label={period.label}
            stats={stats[period.key]}
          />
        ))}
      </CardContent>
    </Card>
  );
});
