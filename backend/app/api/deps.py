from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.core.config import settings
from app.database.database import get_db
from app.models.user import User
from app.repositories.attachment import AttachmentRepository
from app.repositories.project import ProjectRepository
from app.repositories.task import TaskRepository
from app.repositories.user import UserRepository
from app.services.attachment import AttachmentService
from app.services.project import ProjectService
from app.services.task import TaskService
from app.services.user import UserService


SessionDep = Annotated[Session, Depends(get_db)]

bearer_scheme = HTTPBearer(auto_error=False)

BearerCredentials = Annotated[
    HTTPAuthorizationCredentials | None,
    Depends(bearer_scheme),
]


def get_current_user(
    credentials: BearerCredentials,
    session: SessionDep,
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise unauthorized

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = UUID(str(payload.get("sub")))
    except (JWTError, TypeError, ValueError) as exc:
        raise unauthorized from exc

    user = UserRepository(session).get(user_id)
    if user is None or not user.is_active:
        raise unauthorized

    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


def get_user_service(session: SessionDep) -> UserService:
    return UserService(UserRepository(session))


UserServiceDep = Annotated[UserService, Depends(get_user_service)]


def get_project_service(session: SessionDep) -> ProjectService:
    return ProjectService(ProjectRepository(session))


ProjectServiceDep = Annotated[ProjectService, Depends(get_project_service)]


def get_task_service(session: SessionDep) -> TaskService:
    return TaskService(
        TaskRepository(session),
        ProjectRepository(session),
    )


TaskServiceDep = Annotated[TaskService, Depends(get_task_service)]


def get_attachment_service(session: SessionDep) -> AttachmentService:
    return AttachmentService(
        AttachmentRepository(session),
        TaskRepository(session),
        settings.storage_path,
    )


AttachmentServiceDep = Annotated[AttachmentService, Depends(get_attachment_service)]
