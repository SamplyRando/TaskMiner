import type { WorkspaceRole } from "@/types/permissions";

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export type InvitationInviter = {
  id: string;
  email: string;
  full_name: string;
};

export type WorkspaceInvitation = {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  token: string;
  status: InvitationStatus;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  invited_by: InvitationInviter | null;
  created_at: string;
  updated_at: string;
};

export type InvitationCreate = {
  email: string;
  role: Exclude<WorkspaceRole, "owner">;
};

export type InvitationSort =
  | "email"
  | "role"
  | "status"
  | "created_at"
  | "expires_at"
  | "-email"
  | "-role"
  | "-status"
  | "-created_at"
  | "-expires_at";

export type InvitationListParams = {
  skip: number;
  limit: number;
  search?: string;
  sort: InvitationSort;
};

export type InvitationList = {
  items: WorkspaceInvitation[];
  total: number;
  skip: number;
  limit: number;
};
