from fastapi import APIRouter

from app.api.v1.endpoints import (
    attachments,
    auth,
    comments,
    projects,
    task_assignment,
    tasks,
    users,
    workspaces,
    workspace_members,
    workspace_permissions,
)


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(
    workspaces.router,
    prefix="/workspaces",
    tags=["workspaces"],
)
api_router.include_router(
    workspace_members.router,
    prefix="/workspaces",
    tags=["workspace-members"],
)
api_router.include_router(
    workspace_permissions.router,
    prefix="/workspaces",
    tags=["workspace-permissions"],
)
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(tasks.project_router, prefix="/projects", tags=["tasks"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(
    task_assignment.router,
    prefix="/tasks",
    tags=["task-assignment"],
)
api_router.include_router(
    attachments.task_router,
    prefix="/tasks",
    tags=["attachments"],
)
api_router.include_router(
    attachments.router,
    prefix="/attachments",
    tags=["attachments"],
)
api_router.include_router(
    comments.task_router,
    prefix="/tasks",
    tags=["comments"],
)
api_router.include_router(
    comments.router,
    prefix="/comments",
    tags=["comments"],
)
