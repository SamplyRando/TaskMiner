from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
import re
import unicodedata
from uuid import NAMESPACE_URL, UUID, uuid5

from app.ai.provider import AIProviderName
from app.ai.schemas import (
    AIChangeField,
    AIGeneratedMilestone,
    AIGeneratedTask,
    AIProjectChangePlanRequest,
    AIProjectChangePlanResponse,
    AIProjectContext,
    AIProjectPlanRequest,
    AIProjectPlanResponse,
    AIProjectTaskContext,
    AIProjectTaskChange,
)
from app.models.task import TaskPriority, TaskStatus


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

_CHANGE_FIELDS: tuple[AIChangeField, ...] = (
    "title",
    "description",
    "status",
    "priority",
    "due_date",
)


class MockAIProvider:
    """Deterministic provider used until a remote LLM is introduced."""

    provider_name: AIProviderName = "mock"
    display_name = "Mock provider"

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

    async def generate_project_change_plan(
        self,
        request: AIProjectChangePlanRequest,
        context: AIProjectContext,
    ) -> AIProjectChangePlanResponse:
        """Interpret a bounded set of deterministic task-edit instructions."""

        instruction = self._normalize(request.instruction)
        after_states = {
            task.id: task.state.model_copy(deep=True) for task in context.tasks
        }
        reasons: dict[UUID, list[str]] = {task.id: [] for task in context.tasks}
        warnings: list[str] = []
        recognized_operation = False

        shift = self._parse_relative_shift(instruction)
        if shift is not None:
            recognized_operation = True
            days, scope = shift
            matching = self._matching_tasks(context, scope)
            shifted = 0
            for task in matching:
                if task.state.due_date is None:
                    continue
                after_states[task.id].due_date = task.state.due_date + timedelta(
                    days=days
                )
                reasons[task.id].append(f"Échéance décalée de {days} jours.")
                shifted += 1
            if not matching:
                warnings.append("Aucune tâche ne correspond au décalage demandé.")
            elif shifted < len(matching):
                warnings.append(
                    "Les tâches sans échéance n’ont pas été décalées automatiquement."
                )

        priority = self._parse_priority(instruction)
        if priority is not None:
            recognized_operation = True
            priority_value, scope = priority
            matching = self._matching_tasks(context, scope)
            for task in matching:
                after_states[task.id].priority = priority_value
                reasons[task.id].append(f"Priorité proposée : {priority_value.value}.")
            if not matching:
                warnings.append(
                    "Aucune tâche ne correspond au changement de priorité demandé."
                )

        status_changes = self._parse_status_changes(instruction, context)
        if status_changes:
            recognized_operation = True
        for task_id, status in status_changes.items():
            after_states[task_id].status = status
            reasons[task_id].append(f"Statut proposé : {status.value}.")

        try:
            absolute_date = self._parse_absolute_date(instruction, context)
        except ValueError:
            recognized_operation = True
            absolute_date = None
            warnings.append(
                "La date demandée est invalide. Aucune échéance n’a été modifiée."
            )
        if absolute_date is not None:
            recognized_operation = True
            date_value, scope = absolute_date
            matching = self._matching_tasks(context, scope)
            for task in matching:
                after_states[task.id].due_date = date_value
                reasons[task.id].append(
                    f"Échéance proposée : {date_value.date().isoformat()}."
                )
            if not matching:
                warnings.append(
                    "Aucune tâche ne correspond à l’échéance absolue demandée."
                )

        changes: list[AIProjectTaskChange] = []
        for task in context.tasks:
            after = after_states[task.id]
            changed_fields: list[AIChangeField] = [
                field
                for field in _CHANGE_FIELDS
                if getattr(task.state, field) != getattr(after, field)
            ]
            if not changed_fields:
                continue
            fingerprint = "|".join(
                [str(task.id), *changed_fields, after.model_dump_json()]
            )
            changes.append(
                AIProjectTaskChange(
                    change_id=uuid5(NAMESPACE_URL, fingerprint),
                    task_id=task.id,
                    task_title=task.state.title,
                    before=task.state,
                    after=after,
                    changed_fields=changed_fields,
                    reason=" ".join(reasons[task.id]),
                )
            )

        if not recognized_operation:
            warnings.append(
                "L’instruction est ambiguë ou ne correspond pas aux modifications "
                "prises en charge. Reformulez-la plus précisément."
            )
        elif not changes and not warnings:
            warnings.append("Les tâches correspondent déjà à l’état demandé.")

        summary = (
            f"{len(changes)} tâche{'s' if len(changes) > 1 else ''} à réviser "
            f"dans le projet « {context.name} »."
            if changes
            else f"Aucune modification sûre proposée pour « {context.name} »."
        )
        return AIProjectChangePlanResponse(
            summary=summary,
            project_id=context.id,
            changes=changes,
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

    @staticmethod
    def _normalize(value: str | None) -> str:
        if value is None:
            return ""
        decomposed = unicodedata.normalize("NFKD", value.casefold())
        return "".join(
            character
            for character in decomposed
            if not unicodedata.combining(character)
        )

    @classmethod
    def _parse_relative_shift(cls, instruction: str) -> tuple[int, str] | None:
        match = re.search(
            r"(?:decale|decaler|repousse|shift|delay)[^.!?\n]*?"
            r"(?:d['’ ]|de )?(?P<count>\d+|un|une)\s+"
            r"(?P<unit>jour|jours|day|days|semaine|semaines|week|weeks)",
            instruction,
        )
        if match is None:
            return None
        count = (
            1 if match.group("count") in {"un", "une"} else int(match.group("count"))
        )
        unit = match.group("unit")
        days = count * 7 if unit in {"semaine", "semaines", "week", "weeks"} else count
        return days, cls._infer_scope(match.group(0), instruction)

    @classmethod
    def _parse_priority(
        cls,
        instruction: str,
    ) -> tuple[TaskPriority, str] | None:
        match = re.search(
            r"priorite\s+(?P<priority>basse|moyenne|haute|urgente|low|medium|high|urgent)",
            instruction,
        )
        if match is None:
            return None
        priorities = {
            "basse": TaskPriority.LOW,
            "low": TaskPriority.LOW,
            "moyenne": TaskPriority.MEDIUM,
            "medium": TaskPriority.MEDIUM,
            "haute": TaskPriority.HIGH,
            "high": TaskPriority.HIGH,
            "urgente": TaskPriority.URGENT,
            "urgent": TaskPriority.URGENT,
        }
        prefix = instruction[max(0, match.start() - 160) : match.start()]
        return priorities[match.group("priority")], cls._infer_scope(
            prefix, instruction
        )

    @classmethod
    def _parse_status_changes(
        cls,
        instruction: str,
        context: AIProjectContext,
    ) -> dict[UUID, TaskStatus]:
        patterns = (
            (
                r"(?:passe|mets)\s+(?P<target>[^,.\n]+?)\s+en cours",
                TaskStatus.IN_PROGRESS,
            ),
            (
                r"(?:passe|mets)\s+(?P<target>[^,.\n]+?)\s+(?:terminee|done)",
                TaskStatus.DONE,
            ),
            (
                r"(?:passe|mets)\s+(?P<target>[^,.\n]+?)\s+(?:a faire|todo)",
                TaskStatus.TODO,
            ),
        )
        changes: dict[UUID, TaskStatus] = {}
        for pattern, status in patterns:
            for match in re.finditer(pattern, instruction):
                target = match.group("target").strip()
                target = re.sub(r"^(?:la tache|le task|task)\s+", "", target)
                for task in context.tasks:
                    haystack = cls._normalize(
                        f"{task.state.title} {task.state.description or ''}"
                    )
                    if target and target in haystack:
                        changes[task.id] = status
        return changes

    @classmethod
    def _parse_absolute_date(
        cls,
        instruction: str,
        context: AIProjectContext,
    ) -> tuple[datetime, str] | None:
        numeric = re.search(
            r"(?:avant le|au|pour le)\s+(?P<day>\d{1,2})/(?P<month>\d{1,2})/(?P<year>\d{4})",
            instruction,
        )
        month_names = {
            "janvier": 1,
            "fevrier": 2,
            "mars": 3,
            "avril": 4,
            "mai": 5,
            "juin": 6,
            "juillet": 7,
            "aout": 8,
            "septembre": 9,
            "octobre": 10,
            "novembre": 11,
            "decembre": 12,
        }
        named = re.search(
            r"(?:avant le|au|pour le)\s+(?P<day>\d{1,2})\s+"
            r"(?P<month>janvier|fevrier|mars|avril|mai|juin|juillet|aout|"
            r"septembre|octobre|novembre|decembre)(?:\s+(?P<year>\d{4}))?",
            instruction,
        )
        match = numeric or named
        if match is None:
            return None
        years = [
            task.state.due_date.year
            for task in context.tasks
            if task.state.due_date is not None
        ]
        default_year = max(years) if years else datetime.now(timezone.utc).year
        year = int(match.group("year") or default_year)
        month_value = match.group("month")
        month = int(month_value) if numeric is not None else month_names[month_value]
        value = datetime.combine(
            date(year, month, int(match.group("day"))),
            time(12, tzinfo=timezone.utc),
        )
        return value, cls._infer_scope(match.string[: match.start()], instruction)

    @classmethod
    def _infer_scope(cls, segment: str, instruction: str) -> str:
        combined = f"{segment} {instruction}"
        if "api" in segment or ("mets-les" in instruction and "api" in instruction):
            return "keyword:api"
        if "validation" in segment or " qa" in combined:
            return "keyword:validation"
        if "non terminee" in segment or "non terminees" in segment:
            return "incomplete"
        status_scopes = {
            "en cours": "in_progress",
            "a faire": "todo",
            "todo": "todo",
            "terminee": "done",
            "terminees": "done",
            "done": "done",
        }
        for label, status in status_scopes.items():
            if re.search(rf"taches?[^,.!?\n]*\b{label}\b", segment):
                return f"status:{status}"
        priority_scopes = {
            "basse": "low",
            "basses": "low",
            "moyenne": "medium",
            "moyennes": "medium",
            "haute": "high",
            "hautes": "high",
            "urgente": "urgent",
            "urgentes": "urgent",
        }
        for label, priority in priority_scopes.items():
            if re.search(rf"taches?[^,.!?\n]*\b{label}\b", segment):
                return f"priority:{priority}"
        keyword_match = re.search(
            r"(?:toutes?\s+les\s+)?(?:taches?|partie)\s+"
            r"(?:de\s+|du\s+|des\s+|la\s+|le\s+|les\s+)?"
            r"(?P<keyword>[a-z0-9_-]{2,40})",
            segment,
        )
        if keyword_match is not None:
            return f"keyword:{keyword_match.group('keyword')}"
        return "all"

    @classmethod
    def _matching_tasks(
        cls,
        context: AIProjectContext,
        scope: str,
    ) -> list[AIProjectTaskContext]:
        if scope == "incomplete":
            return [
                task for task in context.tasks if task.state.status != TaskStatus.DONE
            ]
        if scope == "priority:urgent":
            priority = TaskPriority.URGENT
            return [task for task in context.tasks if task.state.priority == priority]
        if scope.startswith("priority:"):
            priority = TaskPriority(scope.removeprefix("priority:"))
            return [task for task in context.tasks if task.state.priority == priority]
        if scope.startswith("status:"):
            status = TaskStatus(scope.removeprefix("status:"))
            return [task for task in context.tasks if task.state.status == status]
        if scope.startswith("keyword:"):
            keyword = scope.removeprefix("keyword:")
            aliases = {
                "validation": ("validation", "qa", "test"),
                "api": ("api",),
            }.get(keyword, (keyword,))
            return [
                task
                for task in context.tasks
                if any(
                    alias
                    in cls._normalize(
                        f"{task.state.title} {task.state.description or ''}"
                    )
                    for alias in aliases
                )
            ]
        return list(context.tasks)
