from uuid import UUID, uuid4

from app.core.events import (
    ActivityEventType,
    ActivityResourceType,
    DomainEvent,
    publish,
)
from app.models.project import Project
from app.models.project_task_status import ProjectTaskStatus
from app.models.user import User
from app.models.workspace import Workspace
from app.repositories.project import ProjectRepository
from app.repositories.task import TaskRepository
from app.repositories.workspace import WorkspaceRepository
from app.schemas.pagination import PaginatedResponse
from app.schemas.project import (
    ProjectCreate,
    ProjectListParams,
    ProjectRead,
    ProjectUpdate,
    ProjectTaskStatusCreate,
    ProjectTaskStatusReorder,
    ProjectTaskStatusUpdate,
)
from app.schemas.project_template import ProjectTemplate
from app.schemas.task import TaskCreate
from app.schemas.workspace import WorkspaceCreate
from app.services.permission import PermissionService
from app.services.subscription import SubscriptionService


DEFAULT_WORKSPACE_NAME = "My Workspace"


class ProjectNotFoundError(Exception):
    """Raised when a project is not accessible to its requested owner."""


class ProjectStatusNotFoundError(Exception):
    """Raised when a status key is not part of the selected project."""


class ProjectStatusLimitError(Exception):
    """Raised when a project already has the maximum workflow states."""


class ProjectStatusInUseError(Exception):
    """Raised when removing a used status without an explicit replacement."""


class ProjectStatusInvariantError(Exception):
    """Raised when a workflow change would remove its completed semantic."""


class ProjectService:
    """Application service for project-related use cases."""

    def __init__(
        self,
        repository: ProjectRepository,
        workspace_repository: WorkspaceRepository,
        permission_service: PermissionService,
        subscription_service: SubscriptionService,
        task_repository: TaskRepository,
    ) -> None:
        self.repository = repository
        self.workspace_repository = workspace_repository
        self.permission_service = permission_service
        self.subscription_service = subscription_service
        self.task_repository = task_repository

    def create_project(
        self,
        owner: User,
        data: ProjectCreate,
        workspace_id: UUID | None = None,
    ) -> Project:
        workspace = (
            self.permission_service.require_project_creation(owner, workspace_id)
            if workspace_id is not None
            else self.workspace_repository.get_first_active_by_owner(owner)
        )
        if workspace is None:
            self.subscription_service.serialize_owned_workspace_creation(owner.id)
            workspace = self.workspace_repository.get_first_active_by_owner(owner)
            if workspace is None:
                self.subscription_service.enforce_owned_workspace_limit(owner.id)
                workspace = self.workspace_repository.create(
                    owner,
                    WorkspaceCreate(name=DEFAULT_WORKSPACE_NAME),
                )
        self.subscription_service.enforce_project_limit(workspace.id)
        project = self.repository.create(workspace, data)
        publish(self.project_created_event(owner, workspace, project))
        return project

    def stage_project(
        self,
        actor: User,
        workspace: Workspace,
        data: ProjectCreate,
        *,
        source: str,
    ) -> tuple[Project, DomainEvent]:
        """Stage a project and its event inside a caller-owned transaction."""

        self.subscription_service.enforce_project_limit(workspace.id)

        project = self.repository.create(workspace, data, commit=False)
        return project, self.project_created_event(
            actor,
            workspace,
            project,
            source=source,
        )

    @staticmethod
    def project_created_event(
        actor: User,
        workspace: Workspace,
        project: Project,
        *,
        source: str | None = None,
    ) -> DomainEvent:
        metadata = {"name": project.name}
        if source is not None:
            metadata["source"] = source
        new_values: dict[str, object] = {
            "description": project.description,
            "name": project.name,
        }
        if project.due_date is not None:
            new_values["due_date"] = project.due_date.isoformat()
        return DomainEvent(
            event_type=ActivityEventType.PROJECT_CREATED,
            resource_type=ActivityResourceType.PROJECT,
            workspace_id=workspace.id,
            resource_id=project.id,
            actor_id=actor.id,
            new_values=new_values,
            metadata=metadata,
        )

    def list_projects(
        self,
        owner: User,
        params: ProjectListParams,
    ) -> PaginatedResponse[ProjectRead]:
        projects, total = self.repository.list_for_user(owner, params)
        return PaginatedResponse[ProjectRead](
            items=[ProjectRead.model_validate(project) for project in projects],
            total=total,
            skip=params.skip,
            limit=params.limit,
        )

    def get_project(self, owner: User, project_id: UUID) -> Project:
        project = self.repository.get_by_id_for_user(project_id, owner)
        if project is None:
            raise ProjectNotFoundError
        return project

    def update_project(
        self,
        owner: User,
        project_id: UUID,
        data: ProjectUpdate,
    ) -> Project:
        project = self.repository.get_by_id_for_user(project_id, owner)
        if project is None:
            raise ProjectNotFoundError
        self.permission_service.require_project_management(owner, project.workspace_id)
        return self.repository.update(project, data)

    def delete_project(self, owner: User, project_id: UUID) -> None:
        project = self.repository.get_by_id_for_user(project_id, owner)
        if project is None:
            raise ProjectNotFoundError
        self.permission_service.require_project_management(owner, project.workspace_id)
        self.repository.delete(project)
        publish(
            DomainEvent(
                event_type=ActivityEventType.PROJECT_DELETED,
                resource_type=ActivityResourceType.PROJECT,
                workspace_id=project.workspace_id,
                resource_id=project.id,
                actor_id=owner.id,
                old_values={
                    "description": project.description,
                    "name": project.name,
                },
                metadata={"name": project.name},
            )
        )

    def add_task_status(
        self,
        actor: User,
        project_id: UUID,
        data: ProjectTaskStatusCreate,
    ) -> ProjectTaskStatus:
        project = self._managed_project(actor, project_id)
        if len(project.task_statuses) >= 10:
            raise ProjectStatusLimitError
        key = f"status_{uuid4().hex[:12]}"
        status = self.repository.add_status(
            project,
            key=key,
            label=data.label,
            is_completed=data.is_completed,
        )
        self._publish_workflow_event(actor, project, "status_added", key)
        return status

    def update_task_status(
        self,
        actor: User,
        project_id: UUID,
        key: str,
        data: ProjectTaskStatusUpdate,
    ) -> ProjectTaskStatus:
        project = self._managed_project(actor, project_id)
        status = self._status(project, key)
        if data.is_completed is False and status.is_completed:
            raise ProjectStatusInvariantError
        updated = self.repository.update_status(
            project,
            status,
            label=data.label,
            is_completed=data.is_completed,
        )
        self._publish_workflow_event(actor, project, "status_updated", key)
        return updated

    def reorder_task_statuses(
        self,
        actor: User,
        project_id: UUID,
        data: ProjectTaskStatusReorder,
    ) -> list[ProjectTaskStatus]:
        project = self._managed_project(actor, project_id)
        existing = {status.key for status in project.task_statuses}
        if set(data.keys) != existing or len(data.keys) != len(existing):
            raise ProjectStatusInvariantError
        statuses = self.repository.reorder_statuses(project, data.keys)
        self._publish_workflow_event(actor, project, "statuses_reordered")
        return statuses

    def delete_task_status(
        self,
        actor: User,
        project_id: UUID,
        key: str,
        replacement_status: str | None,
    ) -> None:
        project = self._managed_project(actor, project_id)
        if len(project.task_statuses) <= 2:
            raise ProjectStatusInvariantError
        status = self._status(project, key)
        if status.is_completed:
            raise ProjectStatusInvariantError
        used = self.repository.count_tasks_with_status(project.id, key) > 0
        replacement = None
        if replacement_status is not None:
            replacement = self._status(project, replacement_status)
            if replacement.id == status.id:
                raise ProjectStatusInvariantError
        if used and replacement is None:
            raise ProjectStatusInUseError
        self.repository.delete_status(
            project,
            status,
            replacement_status=replacement,
        )
        self._publish_workflow_event(actor, project, "status_deleted", key)

    def duplicate_project(self, actor: User, project_id: UUID) -> Project:
        source = self._managed_project(actor, project_id)
        workspace = source.workspace
        self.subscription_service.enforce_project_limit(workspace.id)
        statuses = [
            (item.key, item.label, item.position, item.is_completed)
            for item in source.task_statuses
        ]
        try:
            duplicate = self.repository.create(
                workspace,
                ProjectCreate(
                    name=f"{source.name[:247].rstrip()} (copie)",
                    description=source.description,
                    due_date=source.due_date,
                ),
                commit=False,
                statuses=statuses,
            )
            for task in self.task_repository.list_by_project(source):
                self.task_repository.create(
                    duplicate,
                    TaskCreate(
                        title=task.title,
                        description=task.description,
                        status=task.status,
                        priority=task.priority,
                        due_date=task.due_date,
                    ),
                    commit=False,
                )
            self.repository.commit()
        except Exception:
            self.repository.rollback()
            raise
        publish(
            self.project_created_event(actor, workspace, duplicate, source="duplicate")
        )
        return duplicate

    def export_template(self, actor: User, project_id: UUID) -> ProjectTemplate:
        project = self.get_project(actor, project_id)
        return ProjectTemplate.model_validate(
            {
                "format": "taskminer-project-template",
                "version": 1,
                "name": project.name,
                "description": project.description,
                "statuses": [
                    {
                        "key": status.key,
                        "label": status.label,
                        "position": status.position,
                        "is_completed": status.is_completed,
                    }
                    for status in project.task_statuses
                ],
                "tasks": [
                    {
                        "title": task.title,
                        "description": task.description,
                        "priority": task.priority,
                        "status": task.status,
                    }
                    for task in self.task_repository.list_by_project(project)
                ],
            }
        )

    def import_template(
        self,
        actor: User,
        workspace_id: UUID,
        template: ProjectTemplate,
    ) -> Project:
        workspace = self.permission_service.require_project_creation(
            actor,
            workspace_id,
        )
        self.subscription_service.enforce_project_limit(workspace.id)
        statuses = [
            (item.key, item.label, item.position, item.is_completed)
            for item in sorted(template.statuses, key=lambda item: item.position)
        ]
        try:
            project = self.repository.create(
                workspace,
                ProjectCreate(name=template.name, description=template.description),
                commit=False,
                statuses=statuses,
            )
            for item in template.tasks:
                self.task_repository.create(
                    project,
                    TaskCreate(
                        title=item.title,
                        description=item.description,
                        priority=item.priority,
                        status=item.status,
                    ),
                    commit=False,
                )
            self.repository.commit()
        except Exception:
            self.repository.rollback()
            raise
        publish(
            self.project_created_event(
                actor,
                workspace,
                project,
                source="template_import",
            )
        )
        return project

    def _managed_project(self, actor: User, project_id: UUID) -> Project:
        project = self.repository.get_by_id_for_user(project_id, actor)
        if project is None:
            raise ProjectNotFoundError
        self.permission_service.require_project_management(actor, project.workspace_id)
        return project

    @staticmethod
    def _status(project: Project, key: str) -> ProjectTaskStatus:
        status = next((item for item in project.task_statuses if item.key == key), None)
        if status is None:
            raise ProjectStatusNotFoundError
        return status

    @staticmethod
    def _publish_workflow_event(
        actor: User,
        project: Project,
        action: str,
        key: str | None = None,
    ) -> None:
        publish(
            DomainEvent(
                event_type=ActivityEventType.PROJECT_UPDATED,
                resource_type=ActivityResourceType.PROJECT,
                workspace_id=project.workspace_id,
                resource_id=project.id,
                actor_id=actor.id,
                metadata={
                    "source": "project_workflow",
                    "action": action,
                    **({"status": key} if key is not None else {}),
                },
            )
        )
