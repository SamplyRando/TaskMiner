"""Pydantic request and response schemas."""

from app.schemas.attachment import AttachmentRead
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.pagination import PaginatedResponse
from app.schemas.project import (
    ProjectCreate,
    ProjectListParams,
    ProjectRead,
    ProjectUpdate,
)
from app.schemas.task import TaskCreate, TaskListParams, TaskRead, TaskUpdate
from app.schemas.user import UserCreate, UserRead, UserUpdate

__all__ = [
    "AttachmentRead",
    "LoginRequest",
    "PaginatedResponse",
    "ProjectCreate",
    "ProjectListParams",
    "ProjectRead",
    "ProjectUpdate",
    "TaskCreate",
    "TaskListParams",
    "TaskRead",
    "TaskUpdate",
    "TokenResponse",
    "UserCreate",
    "UserRead",
    "UserUpdate",
]
