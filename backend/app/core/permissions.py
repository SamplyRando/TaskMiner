from app.models.workspace_member import WorkspaceMemberRole


def can_view_workspace(role: WorkspaceMemberRole) -> bool:
    return role in {
        WorkspaceMemberRole.OWNER,
        WorkspaceMemberRole.ADMIN,
        WorkspaceMemberRole.MEMBER,
        WorkspaceMemberRole.VIEWER,
    }


def can_manage_workspace(role: WorkspaceMemberRole) -> bool:
    return role == WorkspaceMemberRole.OWNER


def can_delete_workspace(role: WorkspaceMemberRole) -> bool:
    return role == WorkspaceMemberRole.OWNER


def can_create_project(role: WorkspaceMemberRole) -> bool:
    return role in {WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN}


def can_update_project(role: WorkspaceMemberRole) -> bool:
    return role in {WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN}


def can_delete_project(role: WorkspaceMemberRole) -> bool:
    return role in {WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN}


def can_manage_projects(role: WorkspaceMemberRole) -> bool:
    return (
        can_create_project(role)
        and can_update_project(role)
        and can_delete_project(role)
    )


def can_manage_tasks(role: WorkspaceMemberRole) -> bool:
    return role in {
        WorkspaceMemberRole.OWNER,
        WorkspaceMemberRole.ADMIN,
        WorkspaceMemberRole.MEMBER,
    }


def can_view_members(role: WorkspaceMemberRole) -> bool:
    return role in {WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN}


def can_manage_members(role: WorkspaceMemberRole) -> bool:
    return role == WorkspaceMemberRole.OWNER


def can_manage_invitations(role: WorkspaceMemberRole) -> bool:
    return role in {WorkspaceMemberRole.OWNER, WorkspaceMemberRole.ADMIN}


def can_comment(role: WorkspaceMemberRole) -> bool:
    return role != WorkspaceMemberRole.VIEWER


def can_add_attachment(role: WorkspaceMemberRole) -> bool:
    return role != WorkspaceMemberRole.VIEWER
