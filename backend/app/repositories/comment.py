from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.comment import Comment
from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentUpdate


class CommentRepository:
    """Persistence operations for owner-scoped task comments."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def create(
        self,
        task: Task,
        author: User,
        data: CommentCreate,
    ) -> Comment:
        comment = Comment(
            task_id=task.id,
            author_id=author.id,
            content=data.content,
        )
        self.session.add(comment)

        try:
            self.session.commit()
            self.session.refresh(comment)
        except SQLAlchemyError:
            self.session.rollback()
            raise

        return comment

    def list_by_task(self, task: Task) -> list[Comment]:
        statement = (
            select(Comment)
            .where(
                Comment.task_id == task.id,
                Comment.deleted_at.is_(None),
            )
            .order_by(Comment.created_at.asc(), Comment.id.asc())
        )
        return list(self.session.scalars(statement).all())

    def get_by_id_for_owner(
        self,
        comment_id: UUID,
        owner: User,
    ) -> Comment | None:
        statement = (
            select(Comment)
            .join(Task, Comment.task_id == Task.id)
            .join(Project, Task.project_id == Project.id)
            .where(
                Comment.id == comment_id,
                Project.owner_id == owner.id,
                Comment.deleted_at.is_(None),
                Task.deleted_at.is_(None),
                Project.deleted_at.is_(None),
            )
        )
        return self.session.scalar(statement)

    def update(self, comment: Comment, data: CommentUpdate) -> Comment:
        updates = data.model_dump(exclude_unset=True)
        if "content" in updates:
            comment.content = updates["content"]

        try:
            self.session.commit()
            self.session.refresh(comment)
        except SQLAlchemyError:
            self.session.rollback()
            raise

        return comment

    def delete(self, comment: Comment) -> None:
        comment.deleted_at = datetime.now(timezone.utc)
        try:
            self.session.commit()
            self.session.refresh(comment)
        except SQLAlchemyError:
            self.session.rollback()
            raise
