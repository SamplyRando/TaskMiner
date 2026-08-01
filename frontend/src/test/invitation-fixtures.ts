import type { InvitationList, WorkspaceInvitation } from "@/types/invitation";
import type { WorkspacePermissions } from "@/types/permissions";
import type { Workspace } from "@/types/workspace";

export const inviterId = "00000000-0000-4000-8000-000000000011";
export const inviteeId = "00000000-0000-4000-8000-000000000012";
export const firstWorkspace: Workspace = {
  created_at: "2026-08-01T08:00:00Z",
  description: "Workspace Invitations",
  id: "00000000-0000-4000-8000-000000000013",
  name: "Workspace Alpha",
  owner_id: inviterId,
  updated_at: "2026-08-01T08:00:00Z",
};
export const secondWorkspace: Workspace = {
  ...firstWorkspace,
  id: "00000000-0000-4000-8000-000000000014",
  name: "Workspace Beta",
};
export const acceptedWorkspace: Workspace = {
  ...firstWorkspace,
  id: "00000000-0000-4000-8000-000000000015",
  name: "Workspace rejoint",
};

export const invitationFixture: WorkspaceInvitation = {
  accepted_at: null,
  created_at: "2026-08-01T09:00:00Z",
  email: "ada@example.com",
  expires_at: "2026-08-08T09:00:00Z",
  id: "00000000-0000-4000-8000-000000000016",
  invited_by: {
    email: "owner@example.com",
    full_name: "Workspace Owner",
    id: inviterId,
  },
  revoked_at: null,
  role: "member",
  status: "pending",
  token: "secure-invitation-token",
  updated_at: "2026-08-01T09:00:00Z",
  workspace_id: firstWorkspace.id,
};

export const invitationListFixture: InvitationList = {
  items: [invitationFixture],
  limit: 20,
  skip: 0,
  total: 1,
};

export const ownerPermissions: WorkspacePermissions = {
  permissions: {
    manage_invitations: true,
    manage_members: true,
    manage_projects: true,
    manage_tasks: true,
    manage_workspace: true,
    read: true,
  },
  role: "owner",
};

export const memberPermissions: WorkspacePermissions = {
  permissions: {
    manage_invitations: false,
    manage_members: false,
    manage_projects: false,
    manage_tasks: true,
    manage_workspace: false,
    read: true,
  },
  role: "member",
};
