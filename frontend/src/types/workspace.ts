import type { WorkspaceRole } from "@/types/permissions";

export type Workspace = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

export type WorkspaceInput = {
  name: string;
  description: string | null;
};

export type AssignableWorkspaceMember = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: WorkspaceRole;
};

export type AssignableWorkspaceMemberList = {
  items: AssignableWorkspaceMember[];
};
