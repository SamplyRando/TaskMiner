import { activityEventTones } from "@/lib/activity-presentation";
import { toneBadgeClasses } from "@/lib/tones";
import type { ActivityEvent } from "@/types/activity";

export type AuditActionPresentation = {
  className: string;
  label: string;
};

const action = (
  event: ActivityEvent,
  label: string,
): AuditActionPresentation => ({
  className: toneBadgeClasses[activityEventTones[event]],
  label,
});

export const auditActionPresentation: Record<
  ActivityEvent,
  AuditActionPresentation
> = {
  workspace_created: action("workspace_created", "Création"),
  workspace_updated: action("workspace_updated", "Modification"),
  project_created: action("project_created", "Création"),
  project_updated: action("project_updated", "Modification"),
  project_deleted: action("project_deleted", "Suppression"),
  task_created: action("task_created", "Création"),
  task_updated: action("task_updated", "Modification"),
  task_deleted: action("task_deleted", "Suppression"),
  task_assigned: action("task_assigned", "Assignation"),
  comment_created: action("comment_created", "Commentaire"),
  attachment_uploaded: action("attachment_uploaded", "Upload"),
  invitation_created: action("invitation_created", "Invitation"),
  invitation_accepted: action("invitation_accepted", "Invitation"),
  member_role_updated: action("member_role_updated", "Permission"),
};
