import { BarChart3 } from "lucide-react";
import { memo } from "react";

import { EmptyState } from "@/components/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type {
  ActivityEvent,
  DashboardAssigneeDistributionItem,
  DashboardEventDistributionItem,
  DashboardProjectDistributionItem,
} from "@/types/dashboard";

const eventLabels: Record<ActivityEvent, string> = {
  attachment_uploaded: "Uploads",
  comment_created: "Commentaires",
  invitation_accepted: "Invitations acceptées",
  invitation_created: "Invitations créées",
  member_role_updated: "Permissions",
  project_created: "Projets créés",
  project_deleted: "Projets supprimés",
  project_updated: "Projets modifiés",
  task_assigned: "Assignations",
  task_created: "Tâches créées",
  task_deleted: "Tâches supprimées",
  task_updated: "Tâches modifiées",
  workspace_created: "Workspaces créés",
  workspace_updated: "Workspaces modifiés",
};

type DistributionItem = {
  id: string;
  label: string;
  count: number;
  percentage: number;
};

const DistributionCard = ({
  description,
  items,
  title,
}: {
  description: string;
  items: DistributionItem[];
  title: string;
}) => (
  <Card className="h-full min-w-0">
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {items.length === 0 ? (
        <EmptyState
          description="Aucune donnée pour les filtres sélectionnés."
          icon={BarChart3}
          title="Aucune répartition"
        />
      ) : (
        items.map((item) => (
          <div className="space-y-1.5" key={item.id}>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium">{item.label}</span>
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {item.count} · {item.percentage.toLocaleString("fr-FR")}%
              </span>
            </div>
            <Progress
              aria-label={`${item.label} : ${String(item.percentage)} %`}
              value={item.percentage}
            />
          </div>
        ))
      )}
    </CardContent>
  </Card>
);

type DistributionOverviewProps = {
  assignees: DashboardAssigneeDistributionItem[];
  events: DashboardEventDistributionItem[];
  projects: DashboardProjectDistributionItem[];
};

export const DistributionOverview = memo(function DistributionOverview({
  assignees,
  events,
  projects,
}: DistributionOverviewProps) {
  return (
    <section
      aria-label="Répartitions détaillées"
      className="grid min-w-0 gap-4 xl:grid-cols-3"
    >
      <DistributionCard
        description="Les dix projets les plus chargés."
        items={projects.map((item) => ({
          count: item.count,
          id: item.project_id,
          label: item.project_name,
          percentage: item.percentage,
        }))}
        title="Tâches par projet"
      />
      <DistributionCard
        description="Charge actuelle par personne."
        items={assignees.map((item) => ({
          count: item.count,
          id: item.user_id ?? "unassigned",
          label: item.user_name,
          percentage: item.percentage,
        }))}
        title="Tâches par utilisateur"
      />
      <DistributionCard
        description="Événements observés sur la période."
        items={events.map((item) => ({
          count: item.count,
          id: item.event,
          label: eventLabels[item.event],
          percentage: item.percentage,
        }))}
        title="Événements récents"
      />
    </section>
  );
});
