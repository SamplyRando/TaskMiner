import asyncio
from datetime import datetime, timezone
from uuid import UUID

from app.ai.mock_provider import MockAIProvider
from app.ai.schemas import (
    AIProjectChangePlanRequest,
    AIProjectContext,
    AIProjectTaskContext,
    AITaskChangeState,
)
from app.models.task import TaskPriority, TaskStatus


WORKSPACE_ID = UUID("10000000-0000-4000-8000-000000000001")
PROJECT_ID = UUID("20000000-0000-4000-8000-000000000001")


def task_context(
    number: int,
    title: str,
    *,
    status: TaskStatus = TaskStatus.TODO,
    priority: TaskPriority = TaskPriority.MEDIUM,
    due_date: str | None = None,
) -> AIProjectTaskContext:
    return AIProjectTaskContext(
        id=UUID(f"30000000-0000-4000-8000-{number:012d}"),
        state=AITaskChangeState(
            title=title,
            description=f"Work related to {title}",
            status=status,
            priority=priority,
            due_date=(
                datetime.fromisoformat(due_date).replace(tzinfo=timezone.utc)
                if due_date
                else None
            ),
        ),
    )


def project_context() -> AIProjectContext:
    return AIProjectContext(
        id=PROJECT_ID,
        name="TEST AI SPRINT 3",
        description="Natural-language update test project",
        tasks=[
            task_context(1, "API authentication", due_date="2026-09-20T12:00:00"),
            task_context(
                2,
                "API payments",
                status=TaskStatus.IN_PROGRESS,
                due_date="2026-09-22T12:00:00",
            ),
            task_context(
                3,
                "Préparer la documentation",
                priority=TaskPriority.LOW,
                due_date="2026-09-25T12:00:00",
            ),
            task_context(
                4,
                "Launch production",
                priority=TaskPriority.HIGH,
                due_date="2026-09-30T12:00:00",
            ),
        ],
    )


def generate(instruction: str, context: AIProjectContext | None = None):
    request = AIProjectChangePlanRequest(
        workspace_id=WORKSPACE_ID,
        project_id=PROJECT_ID,
        instruction=instruction,
    )
    return asyncio.run(
        MockAIProvider().generate_project_change_plan(
            request,
            context or project_context(),
        )
    )


def test_mock_change_provider_matches_the_manual_qa_scenario() -> None:
    response = generate(
        "Décale toutes les tâches API d'une semaine, mets-les en priorité haute "
        "et passe Préparer la documentation en cours."
    )

    assert response.project_id == PROJECT_ID
    assert [change.task_title for change in response.changes] == [
        "API authentication",
        "API payments",
        "Préparer la documentation",
    ]
    authentication, payments, documentation = response.changes
    assert authentication.changed_fields == ["priority", "due_date"]
    assert authentication.after.priority == TaskPriority.HIGH
    assert authentication.after.due_date == datetime(
        2026, 9, 27, 12, tzinfo=timezone.utc
    )
    assert payments.after.priority == TaskPriority.HIGH
    assert payments.after.due_date == datetime(2026, 9, 29, 12, tzinfo=timezone.utc)
    assert documentation.changed_fields == ["status"]
    assert documentation.after.status == TaskStatus.IN_PROGRESS


def test_mock_change_provider_is_deterministic() -> None:
    instruction = "Décale toutes les tâches API d'une semaine."

    assert generate(instruction) == generate(instruction)


def test_mock_change_provider_filters_non_completed_tasks() -> None:
    context = project_context()
    context.tasks[0].state.status = TaskStatus.DONE

    response = generate(
        "Décale toutes les tâches non terminées de 3 jours.",
        context,
    )

    assert {change.task_title for change in response.changes} == {
        "API payments",
        "Préparer la documentation",
        "Launch production",
    }


def test_mock_change_provider_supports_validation_priority_and_absolute_date() -> None:
    context = AIProjectContext(
        id=PROJECT_ID,
        name="Validation",
        tasks=[
            task_context(
                1,
                "Run QA validation",
                priority=TaskPriority.MEDIUM,
                due_date="2026-09-20T12:00:00",
            ),
            task_context(2, "API implementation", priority=TaskPriority.MEDIUM),
        ],
    )

    priority = generate(
        "Mets toutes les tâches de validation en priorité urgente.",
        context,
    )
    context.tasks[0].state.priority = TaskPriority.URGENT
    absolute = generate("Mets les tâches urgentes avant le 30 septembre 2026.", context)

    assert len(priority.changes) == 1
    assert priority.changes[0].after.priority == TaskPriority.URGENT
    assert len(absolute.changes) == 1
    assert absolute.changes[0].after.due_date == datetime(
        2026, 9, 30, 12, tzinfo=timezone.utc
    )


def test_mock_change_provider_filters_by_status_priority_and_content_keyword() -> None:
    context = AIProjectContext(
        id=PROJECT_ID,
        name="Filters",
        tasks=[
            task_context(
                1,
                "Backend worker",
                status=TaskStatus.IN_PROGRESS,
                priority=TaskPriority.LOW,
                due_date="2026-09-20T12:00:00",
            ),
            task_context(
                2,
                "Frontend screen",
                status=TaskStatus.TODO,
                priority=TaskPriority.HIGH,
                due_date="2026-09-22T12:00:00",
            ),
        ],
    )

    status = generate("Décale les tâches en cours de 2 jours.", context)
    priority = generate("Mets les tâches hautes avant le 30/09/2026.", context)
    keyword = generate("Mets la partie backend en priorité haute.", context)

    assert [change.task_title for change in status.changes] == ["Backend worker"]
    assert [change.task_title for change in priority.changes] == ["Frontend screen"]
    assert [change.task_title for change in keyword.changes] == ["Backend worker"]


def test_mock_change_provider_warns_instead_of_guessing() -> None:
    response = generate("Réorganise tout de la meilleure façon possible.")

    assert response.changes == []
    assert "ambiguë" in response.warnings[0]


def test_mock_change_provider_rejects_an_impossible_date_safely() -> None:
    response = generate("Mets toutes les tâches au 31/02/2026.")

    assert response.changes == []
    assert "date demandée est invalide" in response.warnings[0]
