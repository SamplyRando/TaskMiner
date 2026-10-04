import { toneBadgeClasses } from "@/lib/tones";
import type {
  InvitationDeliveryStatus,
  InvitationStatus,
  WorkspaceInvitation,
} from "@/types/invitation";
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
  pending: toneBadgeClasses.warning,
  accepted: toneBadgeClasses.success,
  expired: toneBadgeClasses.neutral,
  revoked: toneBadgeClasses.danger,
};

export const invitationDeliveryLabels: Record<
  InvitationDeliveryStatus,
  string
> = {
  pending: "Envoi en cours",
  sent: "E-mail envoyé",
  failed: "Échec d’envoi",
  skipped: "Envoi désactivé",
};

export const invitationDeliveryClasses: Record<
  InvitationDeliveryStatus,
  string
> = {
  pending: toneBadgeClasses.warning,
  sent: toneBadgeClasses.success,
  failed: toneBadgeClasses.danger,
  skipped: toneBadgeClasses.neutral,
};

export const getInviterLabel = (invitation: WorkspaceInvitation): string =>
  invitation.invited_by?.full_name ?? "Utilisateur supprimé";
