from uuid import UUID

from app.models.comment import Comment
from app.models.task import Task
from app.models.user import User
from app.repositories.comment import CommentRepository
from app.repositories.task import TaskRepository
from app.schemas.comment import CommentCreate, CommentUpdate


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
    ) -> None:
        self.repository = repository
        self.task_repository = task_repository

    def create_comment(
        self,
        author: User,
        task_id: UUID,
        data: CommentCreate,
    ) -> Comment:
        task = self._get_owned_task(author, task_id)
        return self.repository.create(task, author, data)

    def list_comments(self, owner: User, task_id: UUID) -> list[Comment]:
        task = self._get_owned_task(owner, task_id)
        return self.repository.list_by_task(task)

    def get_comment(self, owner: User, comment_id: UUID) -> Comment:
        comment = self.repository.get_by_id_for_owner(comment_id, owner)
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

    def _get_owned_task(self, owner: User, task_id: UUID) -> Task:
        task = self.task_repository.get_by_id_for_owner(task_id, owner)
        if task is None:
            raise CommentTaskNotFoundError
        return task

    def _get_authored_comment(self, author: User, comment_id: UUID) -> Comment:
        comment = self.repository.get_by_id_for_owner(comment_id, author)
        if comment is None or comment.author_id != author.id:
            raise CommentNotFoundError
        return comment
