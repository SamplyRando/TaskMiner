import { toneBadgeClasses } from "@/lib/tones";
import type { ActivityEvent } from "@/types/activity";

export type AuditActionPresentation = {
  className: string;
  label: string;
};

export const auditActionPresentation: Record<
  ActivityEvent,
  AuditActionPresentation
> = {
  workspace_created: {
    className: toneBadgeClasses.success,
    label: "Création",
  },
  workspace_updated: {
    className: toneBadgeClasses.info,
    label: "Modification",
  },
  project_created: {
    className: toneBadgeClasses.success,
    label: "Création",
  },
  project_updated: {
    className: toneBadgeClasses.info,
    label: "Modification",
  },
  project_deleted: {
    className: toneBadgeClasses.danger,
    label: "Suppression",
  },
  task_created: {
    className: toneBadgeClasses.success,
    label: "Création",
  },
  task_updated: {
    className: toneBadgeClasses.info,
    label: "Modification",
  },
  task_deleted: {
    className: toneBadgeClasses.danger,
    label: "Suppression",
  },
  task_assigned: {
    className: toneBadgeClasses.brand,
    label: "Assignation",
  },
  comment_created: {
    className: toneBadgeClasses.neutral,
    label: "Commentaire",
  },
  attachment_uploaded: {
    className: toneBadgeClasses.neutral,
    label: "Upload",
  },
  invitation_created: {
    className: toneBadgeClasses.neutral,
    label: "Invitation",
  },
  invitation_accepted: {
    className: toneBadgeClasses.success,
    label: "Invitation",
  },
  member_role_updated: {
    className: toneBadgeClasses.warning,
    label: "Permission",
  },
};
