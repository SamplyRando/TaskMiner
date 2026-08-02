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
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    label: "Création",
  },
  workspace_updated: {
    className: "border-violet-200 bg-violet-50 text-violet-800",
    label: "Modification",
  },
  project_created: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    label: "Création",
  },
  project_updated: {
    className: "border-violet-200 bg-violet-50 text-violet-800",
    label: "Modification",
  },
  project_deleted: {
    className: "border-orange-200 bg-orange-50 text-orange-800",
    label: "Suppression",
  },
  task_created: {
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    label: "Création",
  },
  task_updated: {
    className: "border-violet-200 bg-violet-50 text-violet-800",
    label: "Modification",
  },
  task_deleted: {
    className: "border-orange-200 bg-orange-50 text-orange-800",
    label: "Suppression",
  },
  task_assigned: {
    className: "border-violet-200 bg-violet-50 text-violet-800",
    label: "Assignation",
  },
  comment_created: {
    className: "border-blue-200 bg-blue-50 text-blue-800",
    label: "Commentaire",
  },
  attachment_uploaded: {
    className: "border-cyan-200 bg-cyan-50 text-cyan-800",
    label: "Upload",
  },
  invitation_created: {
    className: "border-sky-200 bg-sky-50 text-sky-800",
    label: "Invitation",
  },
  invitation_accepted: {
    className: "border-sky-200 bg-sky-50 text-sky-800",
    label: "Invitation",
  },
  member_role_updated: {
    className: "border-indigo-200 bg-indigo-50 text-indigo-800",
    label: "Permission",
  },
};
