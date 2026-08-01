import type { InvitationStatus, WorkspaceInvitation } from "@/types/invitation";
import type { WorkspaceRole } from "@/types/permissions";

export const invitationRoleLabels: Record<WorkspaceRole, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
  viewer: "Lecteur",
};

export const invitationStatusLabels: Record<InvitationStatus, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  expired: "Expirée",
  revoked: "Révoquée",
};

export const invitationStatusClasses: Record<InvitationStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  accepted: "border-emerald-200 bg-emerald-50 text-emerald-800",
  expired: "border-slate-200 bg-slate-100 text-slate-700",
  revoked: "border-rose-200 bg-rose-50 text-rose-800",
};

export const getInviterLabel = (invitation: WorkspaceInvitation): string =>
  invitation.invited_by?.full_name ?? "Utilisateur supprimé";
