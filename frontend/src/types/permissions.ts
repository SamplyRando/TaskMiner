export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export type WorkspacePermissionFlags = {
  manage_workspace: boolean;
  manage_projects: boolean;
  manage_tasks: boolean;
  manage_members: boolean;
  manage_invitations: boolean;
  read: boolean;
};

export type WorkspacePermissions = {
  role: WorkspaceRole;
  permissions: WorkspacePermissionFlags;
};
