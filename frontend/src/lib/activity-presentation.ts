import type { Tone } from "@/lib/tones";
import type { ActivityEvent, ActivityResource } from "@/types/activity";

export const activityEventLabels: Record<ActivityEvent, string> = {
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

// Semantic tone of each event family, shared by Activity and Audit so a
// creation, a deletion or a permission change reads the same on both feeds.
export const activityEventTones: Record<ActivityEvent, Tone> = {
  attachment_uploaded: "neutral",
  comment_created: "neutral",
  invitation_accepted: "success",
  invitation_created: "neutral",
  member_role_updated: "warning",
  project_created: "success",
  project_deleted: "danger",
  project_updated: "info",
  task_assigned: "brand",
  task_created: "success",
  task_deleted: "danger",
  task_updated: "info",
  workspace_created: "success",
  workspace_updated: "info",
};

export const activityResourceLabels: Record<ActivityResource, string> = {
  attachment: "Pièce jointe",
  comment: "Commentaire",
  invitation: "Invitation",
  member: "Membre",
  project: "Projet",
  task: "Tâche",
  workspace: "Workspace",
};

const metadataLabels: Record<string, string> = {
  assigned_user_id: "Utilisateur assigné",
  email: "E-mail",
  filename: "Fichier",
  name: "Nom",
  new_role: "Nouveau rôle",
  previous_role: "Ancien rôle",
  title: "Titre",
  user_id: "Utilisateur",
};

const formatPrimitive = (value: string | number | boolean): string => {
  if (typeof value === "boolean") {
    return value ? "Oui" : "Non";
  }
  return String(value);
};

// Initials shown in the decorative actor avatar of Activity and Audit rows.
export const getActorInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("fr-FR"))
    .join("");

export const formatActor = (actorId: string | null): string =>
  actorId ? `Utilisateur ${actorId.slice(0, 8)}` : "Système";

export const getMetadataSummary = (
  metadata: Record<string, unknown>,
  fallback = "Aucun détail supplémentaire",
): string => {
  for (const key of ["name", "title", "email", "filename"] as const) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  const details = Object.entries(metadata)
    .filter((entry): entry is [string, string | number | boolean] =>
      ["string", "number", "boolean"].includes(typeof entry[1]),
    )
    .slice(0, 2)
    .map(
      ([key, value]) =>
        `${metadataLabels[key] ?? key.replaceAll("_", " ")} : ${formatPrimitive(value)}`,
    );

  return details.length > 0 ? details.join(" · ") : fallback;
};

export const getChangeSummary = (
  oldValues: Record<string, unknown> | null,
  newValues: Record<string, unknown> | null,
  metadata: Record<string, unknown>,
): string => {
  const changedFields = new Set([
    ...Object.keys(oldValues ?? {}),
    ...Object.keys(newValues ?? {}),
  ]);
  if (changedFields.size === 0) {
    return getMetadataSummary(metadata);
  }

  const labels = [...changedFields]
    .slice(0, 3)
    .map((field) => metadataLabels[field] ?? field.replaceAll("_", " "));
  const remaining = changedFields.size - labels.length;
  return `${labels.join(", ")}${remaining > 0 ? ` et ${String(remaining)} autre${remaining > 1 ? "s" : ""}` : ""}`;
};
