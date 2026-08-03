import { Activity, ArrowUpRight } from "lucide-react";
import { memo } from "react";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/empty-state";
import { EmptyStateLink } from "@/components/empty-state-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { formatRelativeDate } from "@/lib/format";
import type { ActivityResource, DashboardActivity } from "@/types/dashboard";

const resourceLinks: Record<ActivityResource, string> = {
  attachment: "/app/tasks",
  comment: "/app/tasks",
  invitation: "/app/invitations",
  member: "/app/workspace",
  project: "/app/projects",
  task: "/app/tasks",
  workspace: "/app/workspace",
};

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("fr-FR"))
    .join("");

type ActivityListProps = {
  items: DashboardActivity[];
  limit?: number;
  onLimitChange?: (limit: number) => void;
};

export const ActivityList = memo(function ActivityList({
  items,
  limit = 8,
  onLimitChange,
}: ActivityListProps) {
  return (
    <Card className="h-full min-w-0">
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Dernières activités</CardTitle>
          <CardDescription>
            Événements récents de vos workspaces.
          </CardDescription>
        </div>
        {onLimitChange ? (
          <Select
            aria-label="Nombre maximal d’activités"
            className="w-32"
            onChange={(event) => {
              onLimitChange(Number(event.target.value));
            }}
            value={limit}
          >
            {[5, 8, 12, 20].map((value) => (
              <option key={value} value={value}>
                {value} éléments
              </option>
            ))}
          </Select>
        ) : null}
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {items.length === 0 ? (
          <EmptyState
            action={
              <EmptyStateLink to="/app/activity">
                Voir l’activité
              </EmptyStateLink>
            }
            description="Les prochaines actions réalisées apparaîtront ici."
            icon={Activity}
            title="Aucune activité"
          />
        ) : (
          <ul className="divide-y">
            {items.map((item) => {
              const actorName = item.actor?.full_name ?? "TaskMiner";
              return (
                <li className="flex gap-3 px-6 py-3" key={item.id}>
                  <div
                    aria-hidden="true"
                    className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  >
                    {initials(actorName) || "TM"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                      <p className="truncate text-sm font-medium">
                        {item.message}
                      </p>
                      <time
                        className="text-muted-foreground shrink-0 text-xs"
                        dateTime={item.created_at}
                      >
                        {formatRelativeDate(item.created_at)}
                      </time>
                    </div>
                    <div className="text-muted-foreground mt-0.5 flex min-w-0 items-center gap-1 text-sm">
                      <span className="truncate">
                        {actorName} · {item.workspace_name}
                      </span>
                      <Link
                        aria-label={`Ouvrir la ressource liée à ${item.message}`}
                        className="text-primary ml-auto inline-flex shrink-0 items-center gap-1 font-medium hover:underline"
                        to={resourceLinks[item.resource]}
                      >
                        Voir
                        <ArrowUpRight aria-hidden="true" className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
});
