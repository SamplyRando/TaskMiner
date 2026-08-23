from uuid import UUID

from app.core.events import (
    ActivityEventType,
    ActivityResourceType,
    DomainEvent,
    publish,
)
from app.models.comment import Comment
from app.models.task import Task
from app.models.user import User
from app.repositories.comment import CommentRepository
from app.repositories.task import TaskRepository
from app.schemas.comment import CommentCreate, CommentUpdate
from app.services.permission import PermissionService


class CommentTaskNotFoundError(Exception):
    """Raised when a comment's parent task is inaccessible."""


class CommentNotFoundError(Exception):
    """Raised when a comment is inaccessible to the current user."""


class CommentService:
    """Application service for task comment use cases."""

    def __init__(
        self,
        repository: CommentRepository,
        task_repository: TaskRepository,
        permission_service: PermissionService,
    ) -> None:
        self.repository = repository
        self.task_repository = task_repository
        self.permission_service = permission_service

    def create_comment(
        self,
        author: User,
        task_id: UUID,
        data: CommentCreate,
    ) -> Comment:
        task = self._get_accessible_task(author, task_id)
        self.permission_service.require_task_management(
            author,
            task.project.workspace_id,
        )
        comment = self.repository.create(task, author, data)
        publish(
            DomainEvent(
                event_type=ActivityEventType.COMMENT_CREATED,
                resource_type=ActivityResourceType.COMMENT,
                workspace_id=task.project.workspace_id,
                resource_id=comment.id,
                actor_id=author.id,
                new_values={
                    "content": comment.content,
                    "task_id": str(task.id),
                },
                metadata={"task_id": str(task.id)},
            )
        )
        return comment

    def list_comments(self, owner: User, task_id: UUID) -> list[Comment]:
        task = self._get_accessible_task(owner, task_id)
        return self.repository.list_by_task(task)

    def get_comment(self, owner: User, comment_id: UUID) -> Comment:
        comment = self.repository.get_by_id_for_user(comment_id, owner)
        if comment is None:
            raise CommentNotFoundError
        return comment

    def update_comment(
        self,
        author: User,
        comment_id: UUID,
        data: CommentUpdate,
    ) -> Comment:
        comment = self._get_authored_comment(author, comment_id)
        return self.repository.update(comment, data)

    def delete_comment(self, author: User, comment_id: UUID) -> None:
        comment = self._get_authored_comment(author, comment_id)
        self.repository.delete(comment)

    def _get_accessible_task(self, owner: User, task_id: UUID) -> Task:
        task = self.task_repository.get_by_id_for_user(task_id, owner)
        if task is None:
            raise CommentTaskNotFoundError
        return task

    def _get_authored_comment(self, author: User, comment_id: UUID) -> Comment:
        comment = self.repository.get_by_id_for_user(comment_id, author)
        if comment is None or comment.author_id != author.id:
            raise CommentNotFoundError
        self.permission_service.require_task_management(
            author,
            comment.task.project.workspace_id,
        )
        return comment
