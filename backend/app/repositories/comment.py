from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.models.comment import Comment, CommentMention
from app.models.project import Project
from app.models.task import Task
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workspace_member import WorkspaceMember
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
        mentioned_users: list[User],
    ) -> Comment:
        comment = Comment(
            task_id=task.id,
            author=author,
            content=data.content,
            mention_links=[CommentMention(user=user) for user in mentioned_users],
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
            .options(
                selectinload(Comment.author),
                selectinload(Comment.mention_links).selectinload(CommentMention.user),
            )
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
            .options(
                selectinload(Comment.author),
                selectinload(Comment.mention_links).selectinload(CommentMention.user),
            )
            .join(Task, Comment.task_id == Task.id)
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .where(
                Comment.id == comment_id,
                Workspace.owner_id == owner.id,
                Comment.deleted_at.is_(None),
                Task.deleted_at.is_(None),
                Project.deleted_at.is_(None),
                Workspace.deleted_at.is_(None),
            )
        )
        return self.session.scalar(statement)

    def get_by_id_for_user(
        self,
        comment_id: UUID,
        user: User,
    ) -> Comment | None:
        statement = (
            select(Comment)
            .options(
                selectinload(Comment.author),
                selectinload(Comment.mention_links).selectinload(CommentMention.user),
            )
            .join(Task, Comment.task_id == Task.id)
            .join(Project, Task.project_id == Project.id)
            .join(Workspace, Project.workspace_id == Workspace.id)
            .join(
                WorkspaceMember,
                WorkspaceMember.workspace_id == Workspace.id,
            )
            .where(
                Comment.id == comment_id,
                WorkspaceMember.user_id == user.id,
                Comment.deleted_at.is_(None),
                Task.deleted_at.is_(None),
                Project.deleted_at.is_(None),
                Workspace.deleted_at.is_(None),
            )
        )
        return self.session.scalar(statement)

    def list_active_workspace_users(
        self,
        workspace_id: UUID,
        user_ids: list[UUID],
    ) -> list[User]:
        if not user_ids:
            return []
        statement = (
            select(User)
            .join(WorkspaceMember, WorkspaceMember.user_id == User.id)
            .join(Workspace, Workspace.id == WorkspaceMember.workspace_id)
            .where(
                WorkspaceMember.workspace_id == workspace_id,
                User.id.in_(user_ids),
                User.is_active.is_(True),
                User.deleted_at.is_(None),
                Workspace.deleted_at.is_(None),
            )
        )
        return list(self.session.scalars(statement).all())

    def update(
        self,
        comment: Comment,
        data: CommentUpdate,
        mentioned_users: list[User] | None,
    ) -> tuple[Comment, set[UUID]]:
        updates = data.model_dump(exclude_unset=True)
        if "content" in updates:
            comment.content = updates["content"]
        previous_mentions = {link.user_id for link in comment.mention_links}
        if mentioned_users is not None:
            requested_mentions = {user.id for user in mentioned_users}
            for link in list(comment.mention_links):
                if link.user_id not in requested_mentions:
                    comment.mention_links.remove(link)
            existing_mentions = {link.user_id for link in comment.mention_links}
            comment.mention_links.extend(
                CommentMention(user=user)
                for user in mentioned_users
                if user.id not in existing_mentions
            )

        try:
            self.session.commit()
            self.session.refresh(comment)
        except SQLAlchemyError:
            self.session.rollback()
            raise

        current_mentions = {link.user_id for link in comment.mention_links}
        return comment, current_mentions - previous_mentions

    def delete(self, comment: Comment) -> None:
        comment.deleted_at = datetime.now(timezone.utc)
        try:
            self.session.commit()
            self.session.refresh(comment)
        except SQLAlchemyError:
            self.session.rollback()
            raise
