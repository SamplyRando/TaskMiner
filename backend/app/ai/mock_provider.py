from dataclasses import dataclass
from datetime import date, timedelta

from app.ai.schemas import (
    AIGeneratedMilestone,
    AIGeneratedTask,
    AIProjectPlanRequest,
    AIProjectPlanResponse,
)
from app.models.task import TaskPriority


@dataclass(frozen=True)
class _TaskTemplate:
    title: str
    description: str
    priority: TaskPriority
    milestone: str
    days_before_target: int
    depends_on: tuple[int, ...] = ()


@dataclass(frozen=True)
class _MilestoneTemplate:
    name: str
    description: str
    days_before_target: int


_LAUNCH_TASKS = (
    _TaskTemplate(
        "Define launch scope",
        "Confirm the release objective, audience, constraints, and success criteria.",
        TaskPriority.HIGH,
        "Planning",
        14,
    ),
    _TaskTemplate(
        "Finalize landing page",
        "Complete launch messaging, product presentation, and final page review.",
        TaskPriority.HIGH,
        "Product preparation",
        11,
        (1,),
    ),
    _TaskTemplate(
        "Complete API documentation",
        "Document the release-facing API behavior and verify all examples.",
        TaskPriority.MEDIUM,
        "Product preparation",
        9,
        (1,),
    ),
    _TaskTemplate(
        "Run QA validation",
        "Validate critical user journeys, regressions, and release readiness.",
        TaskPriority.URGENT,
        "Validation",
        6,
        (2, 3),
    ),
    _TaskTemplate(
        "Prepare launch campaign",
        "Coordinate campaign assets, channels, owners, and publication timing.",
        TaskPriority.HIGH,
        "Go to market",
        4,
        (1,),
    ),
    _TaskTemplate(
        "Review launch readiness",
        "Review remaining risks, approvals, dependencies, and rollback plans.",
        TaskPriority.URGENT,
        "Launch",
        1,
        (4, 5),
    ),
    _TaskTemplate(
        "Publish release",
        "Coordinate the final release and communicate launch status to the team.",
        TaskPriority.HIGH,
        "Launch",
        0,
        (6,),
    ),
)

_GENERAL_TASKS = (
    _TaskTemplate(
        "Clarify project scope",
        "Confirm the objective, constraints, stakeholders, and expected outcome.",
        TaskPriority.HIGH,
        "Planning",
        14,
    ),
    _TaskTemplate(
        "Map required deliverables",
        "Turn the project brief into concrete, reviewable deliverables.",
        TaskPriority.HIGH,
        "Planning",
        12,
        (1,),
    ),
    _TaskTemplate(
        "Assign execution owners",
        "Identify an accountable owner and collaborators for each deliverable.",
        TaskPriority.MEDIUM,
        "Execution",
        10,
        (2,),
    ),
    _TaskTemplate(
        "Complete priority work",
        "Execute the highest-impact deliverables identified in the plan.",
        TaskPriority.HIGH,
        "Execution",
        6,
        (2, 3),
    ),
    _TaskTemplate(
        "Validate project output",
        "Review completed work against the agreed scope and quality criteria.",
        TaskPriority.HIGH,
        "Validation",
        3,
        (4,),
    ),
    _TaskTemplate(
        "Resolve readiness risks",
        "Address open dependencies, decisions, and blockers before completion.",
        TaskPriority.URGENT,
        "Validation",
        1,
        (5,),
    ),
    _TaskTemplate(
        "Complete project handoff",
        "Confirm delivery, document outcomes, and communicate next actions.",
        TaskPriority.MEDIUM,
        "Completion",
        0,
        (6,),
    ),
)

_LAUNCH_MILESTONES = (
    _MilestoneTemplate(
        "Scope confirmed",
        "The launch scope and success criteria are agreed.",
        12,
    ),
    _MilestoneTemplate(
        "Release candidate ready",
        "Product preparation and validation are complete.",
        3,
    ),
    _MilestoneTemplate(
        "Launch complete",
        "The release is published and communicated.",
        0,
    ),
)

_GENERAL_MILESTONES = (
    _MilestoneTemplate(
        "Plan approved",
        "Scope, deliverables, and responsibilities are confirmed.",
        12,
    ),
    _MilestoneTemplate(
        "Core work complete",
        "The primary project deliverables are ready for validation.",
        3,
    ),
    _MilestoneTemplate(
        "Project complete",
        "The final output is validated and handed off.",
        0,
    ),
)

_LAUNCH_KEYWORDS = {
    "campaign",
    "launch",
    "mobile app",
    "release",
    "rollout",
}


class MockAIProvider:
    """Deterministic provider used until a remote LLM is introduced."""

    async def generate_project_plan(
        self,
        request: AIProjectPlanRequest,
    ) -> AIProjectPlanResponse:
        normalized_prompt = request.prompt.casefold()
        is_launch_plan = any(
            keyword in normalized_prompt for keyword in _LAUNCH_KEYWORDS
        )
        task_templates = _LAUNCH_TASKS if is_launch_plan else _GENERAL_TASKS
        milestone_templates = (
            _LAUNCH_MILESTONES if is_launch_plan else _GENERAL_MILESTONES
        )

        tasks = [
            AIGeneratedTask(
                title=template.title,
                description=template.description,
                priority=template.priority,
                suggested_due_date=self._suggested_date(
                    request.target_date,
                    template.days_before_target,
                ),
                milestone=template.milestone,
                order=order,
                depends_on=list(template.depends_on),
            )
            for order, template in enumerate(task_templates, start=1)
        ]
        milestones = [
            AIGeneratedMilestone(
                name=template.name,
                description=template.description,
                suggested_due_date=self._suggested_date(
                    request.target_date,
                    template.days_before_target,
                ),
                order=order,
            )
            for order, template in enumerate(milestone_templates, start=1)
        ]

        summary = (
            "A structured launch plan covering scope, product preparation, "
            "quality validation, and go-to-market work."
            if is_launch_plan
            else "A structured starting plan covering project scope, execution, "
            "validation, and handoff."
        )
        warnings = (
            []
            if request.target_date is not None
            else ["No target date was provided; suggested due dates are omitted."]
        )
        return AIProjectPlanResponse(
            summary=summary,
            tasks=tasks,
            milestones=milestones,
            warnings=warnings,
        )

    @staticmethod
    def _suggested_date(
        target_date: date | None,
        days_before_target: int,
    ) -> date | None:
        if target_date is None:
            return None
        return target_date - timedelta(days=days_before_target)
