import { Activity, Circle } from "lucide-react";
import { memo } from "react";

import { EmptyState } from "@/components/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import type { ActivityEvent, DashboardActivity } from "@/types/dashboard";

const eventLabels: Record<ActivityEvent, string> = {
  attachment_uploaded: "Pièce jointe ajoutée",
  comment_created: "Commentaire ajouté",
  invitation_accepted: "Invitation acceptée",
  invitation_created: "Invitation créée",
  member_role_updated: "Rôle d’un membre modifié",
  project_created: "Projet créé",
  project_deleted: "Projet supprimé",
  project_updated: "Projet modifié",
  task_assigned: "Tâche assignée",
  task_created: "Tâche créée",
  task_deleted: "Tâche supprimée",
  task_updated: "Tâche modifiée",
  workspace_created: "Workspace créé",
  workspace_updated: "Workspace modifié",
};

const getActivityDetail = (activity: DashboardActivity): string => {
  for (const key of ["name", "title", "email", "filename"] as const) {
    const value = activity.metadata[key];
    if (typeof value === "string") {
      return value;
    }
  }
  return activity.workspace_name;
};

type ActivityListProps = {
  items: DashboardActivity[];
};

export const ActivityList = memo(function ActivityList({
  items,
}: ActivityListProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Dernières activités</CardTitle>
        <CardDescription>Événements récents de vos workspaces.</CardDescription>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        {items.length === 0 ? (
          <EmptyState
            description="Les prochaines actions réalisées apparaîtront ici."
            icon={Activity}
            title="Aucune activité"
          />
        ) : (
          <ul className="divide-y">
            {items.map((item) => (
              <li className="flex gap-3 px-6 py-3" key={item.id}>
                <Circle
                  aria-hidden="true"
                  className="text-primary mt-1 size-2 shrink-0 fill-current"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                    <p className="truncate text-sm font-medium">
                      {eventLabels[item.event]}
                    </p>
                    <time className="text-muted-foreground shrink-0 text-xs">
                      {formatDateTime(item.created_at)}
                    </time>
                  </div>
                  <p className="text-muted-foreground mt-0.5 truncate text-sm">
                    {getActivityDetail(item)} · {item.workspace_name}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
});
