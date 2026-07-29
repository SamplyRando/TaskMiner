from pydantic import BaseModel, ConfigDict

from app.models.workspace_member import WorkspaceMemberRole


class WorkspacePermissionFlags(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    manage_workspace: bool
    manage_projects: bool
    manage_tasks: bool
    manage_members: bool
    read: bool


class WorkspacePermissionsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    role: WorkspaceMemberRole
    permissions: WorkspacePermissionFlags
