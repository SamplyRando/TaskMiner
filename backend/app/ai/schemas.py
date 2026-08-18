from datetime import date, datetime
import hashlib
import json
from typing import Literal, Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.task import TaskPriority, TaskStatus
from app.schemas.project import ProjectCreate
from app.schemas.task import TaskCreate


class AIProjectPlanRequest(BaseModel):
    """Validated context used to generate a transient project-plan draft."""

    model_config = ConfigDict(extra="forbid")

    workspace_id: UUID
    project_id: UUID | None = None
    prompt: str = Field(min_length=10, max_length=5_000)
    target_date: date | None = None

    @field_validator("prompt", mode="before")
    @classmethod
    def trim_prompt(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class AIGeneratedTask(BaseModel):
    """One task suggestion in a generated project-plan draft."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5_000)
    priority: TaskPriority
    status: TaskStatus = TaskStatus.TODO
    suggested_due_date: date | None = None
    milestone: str | None = Field(default=None, max_length=255)
    order: int = Field(ge=1)
    depends_on: list[int] = Field(default_factory=list)


class AIGeneratedMilestone(BaseModel):
    """One milestone suggestion in a generated project-plan draft."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5_000)
    suggested_due_date: date | None = None
    order: int = Field(ge=1)


class AIProjectPlanResponse(BaseModel):
    """Structured, non-persisted plan proposed by an AI provider."""

    model_config = ConfigDict(extra="forbid")

    summary: str = Field(min_length=1, max_length=2_000)
    tasks: list[AIGeneratedTask]
    milestones: list[AIGeneratedMilestone]
    warnings: list[str]


class AIApprovedTask(TaskCreate):
    """One user-reviewed task accepted for persistence."""

    source_order: int = Field(ge=1)
    description: str | None = Field(default=None, max_length=5_000)
    assigned_user_id: UUID | None = None
    milestone: str | None = Field(default=None, max_length=255)
    depends_on: list[int] = Field(default_factory=list, max_length=50)


class AIApplyProjectPlanRequest(BaseModel):
    """Strict payload for applying an explicitly approved AI draft."""

    model_config = ConfigDict(extra="forbid")

    workspace_id: UUID
    project_id: UUID | None = None
    project: ProjectCreate | None = None
    tasks: list[AIApprovedTask] = Field(min_length=1, max_length=50)
    source_task_count: int = Field(ge=1, le=50)
    idempotency_key: UUID

    @model_validator(mode="after")
    def validate_project_mode_and_dependencies(self) -> Self:
        if self.project_id is None and self.project is None:
            raise ValueError("project is required when project_id is omitted")
        if self.project_id is not None and self.project is not None:
            raise ValueError("project must be omitted when project_id is provided")
        if self.source_task_count < len(self.tasks):
            raise ValueError("source_task_count cannot be smaller than tasks")

        source_orders = [task.source_order for task in self.tasks]
        if len(source_orders) != len(set(source_orders)):
            raise ValueError("task source_order values must be unique")
        valid_orders = set(source_orders)
        dependencies: dict[int, set[int]] = {}
        for task in self.tasks:
            task_dependencies = set(task.depends_on)
            if task.source_order in task_dependencies:
                raise ValueError("a task cannot depend on itself")
            if not task_dependencies <= valid_orders:
                raise ValueError("depends_on must reference an approved task")
            dependencies[task.source_order] = task_dependencies
        self._validate_acyclic_dependencies(dependencies)
        return self

    @staticmethod
    def _validate_acyclic_dependencies(
        dependencies: dict[int, set[int]],
    ) -> None:
        visiting: set[int] = set()
        visited: set[int] = set()

        def visit(order: int) -> None:
            if order in visiting:
                raise ValueError("task dependencies must not contain a cycle")
            if order in visited:
                return
            visiting.add(order)
            for dependency in dependencies[order]:
                visit(dependency)
            visiting.remove(order)
            visited.add(order)

        for source_order in dependencies:
            visit(source_order)

    def request_hash(self) -> str:
        """Return a stable fingerprint without retaining the approved content."""

        payload = self.model_dump(mode="json", exclude={"idempotency_key"})
        serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(serialized.encode()).hexdigest()


class AIApplyProjectPlanResponse(BaseModel):
    """Minimal result of an atomic project-plan application."""

    model_config = ConfigDict(extra="forbid")

    project_id: UUID
    created_project: bool
    created_task_ids: list[UUID]
    created_task_count: int = Field(ge=0)
    skipped_task_count: int = Field(ge=0)
    idempotent_replay: bool
    warnings: list[str] = Field(default_factory=list)


AIChangeField = Literal["title", "description", "status", "priority", "due_date"]


class AIProjectChangePlanRequest(BaseModel):
    """Natural-language instruction scoped to one existing project."""

    model_config = ConfigDict(extra="forbid")

    workspace_id: UUID
    project_id: UUID
    instruction: str = Field(min_length=10, max_length=5_000)

    @field_validator("instruction", mode="before")
    @classmethod
    def trim_instruction(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class AITaskChangeState(BaseModel):
    """Supported mutable task fields at one point in time."""

    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5_000)
    status: TaskStatus
    priority: TaskPriority
    due_date: datetime | None = None


class AIProjectTaskContext(BaseModel):
    """Safe server-owned task context supplied to an AI provider."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    state: AITaskChangeState
    assigned_user_id: UUID | None = None
    assigned_user_name: str | None = Field(default=None, max_length=255)


class AIProjectContext(BaseModel):
    """Safe project snapshot used for change-plan generation."""

    model_config = ConfigDict(extra="forbid")

    id: UUID
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    tasks: list[AIProjectTaskContext]


class AIProjectTaskChange(BaseModel):
    """One provider-proposed update to a real task."""

    model_config = ConfigDict(extra="forbid")

    change_id: UUID
    entity_type: Literal["task"] = "task"
    task_id: UUID
    task_title: str = Field(min_length=1, max_length=255)
    before: AITaskChangeState
    after: AITaskChangeState
    changed_fields: list[AIChangeField] = Field(min_length=1, max_length=5)
    reason: str = Field(min_length=1, max_length=1_000)

    @model_validator(mode="after")
    def validate_changed_fields(self) -> Self:
        _validate_task_change(self.before, self.after, self.changed_fields)
        return self


class AIProjectChangePlanResponse(BaseModel):
    """Read-only structured change plan based on current server state."""

    model_config = ConfigDict(extra="forbid")

    summary: str = Field(min_length=1, max_length=2_000)
    project_id: UUID
    changes: list[AIProjectTaskChange]
    warnings: list[str]


class AIApprovedTaskChange(BaseModel):
    """One user-reviewed task mutation approved for application."""

    model_config = ConfigDict(extra="forbid")

    change_id: UUID
    task_id: UUID
    before: AITaskChangeState
    after: AITaskChangeState
    changed_fields: list[AIChangeField] = Field(min_length=1, max_length=5)

    @model_validator(mode="after")
    def validate_changed_fields(self) -> Self:
        _validate_task_change(self.before, self.after, self.changed_fields)
        return self


class AIApplyProjectChangePlanRequest(BaseModel):
    """Strict payload for applying reviewed task changes atomically."""

    model_config = ConfigDict(extra="forbid")

    workspace_id: UUID
    project_id: UUID
    source_change_count: int = Field(ge=1, le=50)
    changes: list[AIApprovedTaskChange] = Field(min_length=1, max_length=50)
    idempotency_key: UUID

    @model_validator(mode="after")
    def validate_change_set(self) -> Self:
        if self.source_change_count < len(self.changes):
            raise ValueError("source_change_count cannot be smaller than changes")
        task_ids = [change.task_id for change in self.changes]
        if len(task_ids) != len(set(task_ids)):
            raise ValueError("each task can appear only once")
        change_ids = [change.change_id for change in self.changes]
        if len(change_ids) != len(set(change_ids)):
            raise ValueError("change_id values must be unique")
        return self

    def request_hash(self) -> str:
        payload = self.model_dump(mode="json", exclude={"idempotency_key"})
        serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(serialized.encode()).hexdigest()


class AIApplyProjectChangePlanResponse(BaseModel):
    """Result of an atomic, idempotent AI-assisted task update."""

    model_config = ConfigDict(extra="forbid")

    project_id: UUID
    modified_task_ids: list[UUID]
    modified_task_count: int = Field(ge=0)
    changed_field_count: int = Field(ge=0)
    skipped_change_count: int = Field(ge=0)
    idempotent_replay: bool


class AIProjectChangeConflict(BaseModel):
    """Current task state that no longer matches a reviewed snapshot."""

    model_config = ConfigDict(extra="forbid")

    task_id: UUID
    task_title: str = Field(min_length=1, max_length=255)
    expected: AITaskChangeState
    current: AITaskChangeState


def _validate_task_change(
    before: AITaskChangeState,
    after: AITaskChangeState,
    changed_fields: list[AIChangeField],
) -> None:
    if len(changed_fields) != len(set(changed_fields)):
        raise ValueError("changed_fields must be unique")
    actual_changes = {
        field
        for field in ("title", "description", "status", "priority", "due_date")
        if getattr(before, field) != getattr(after, field)
    }
    if set(changed_fields) != actual_changes:
        raise ValueError("changed_fields must exactly describe before/after changes")
