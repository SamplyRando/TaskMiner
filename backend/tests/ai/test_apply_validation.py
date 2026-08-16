from uuid import uuid4

from fastapi.testclient import TestClient
import pytest

from tests.factories import CreatedWorkspace
from tests.ai.test_apply import apply_payload, approved_task


@pytest.mark.parametrize(
    "tasks",
    [
        [],
        [approved_task(index + 1) for index in range(51)],
    ],
)
def test_apply_rejects_invalid_task_count(
    client: TestClient,
    workspace: CreatedWorkspace,
    tasks: list[dict[str, object]],
) -> None:
    payload = apply_payload(workspace.id)
    payload["tasks"] = tasks
    payload["source_task_count"] = max(1, len(tasks))

    response = client.post(
        "/api/v1/ai/project-plan/apply",
        headers=workspace.owner.headers,
        json=payload,
    )

    assert response.status_code == 422


@pytest.mark.parametrize(
    "tasks",
    [
        [approved_task(1), approved_task(1)],
        [approved_task(1, depends_on=[1])],
        [approved_task(1, depends_on=[2])],
        [approved_task(1, depends_on=[2]), approved_task(2, depends_on=[1])],
    ],
)
def test_apply_rejects_invalid_dependency_graph(
    client: TestClient,
    workspace: CreatedWorkspace,
    tasks: list[dict[str, object]],
) -> None:
    response = client.post(
        "/api/v1/ai/project-plan/apply",
        headers=workspace.owner.headers,
        json=apply_payload(workspace.id, tasks=tasks),
    )

    assert response.status_code == 422


def test_apply_requires_exactly_one_project_mode(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    missing = apply_payload(workspace.id)
    missing["project"] = None
    both = apply_payload(workspace.id)
    both["project_id"] = str(uuid4())

    missing_response = client.post(
        "/api/v1/ai/project-plan/apply",
        headers=workspace.owner.headers,
        json=missing,
    )
    both_response = client.post(
        "/api/v1/ai/project-plan/apply",
        headers=workspace.owner.headers,
        json=both,
    )

    assert missing_response.status_code == 422
    assert both_response.status_code == 422


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("title", ""),
        ("title", "x" * 256),
        ("description", "x" * 5_001),
        ("priority", "critical"),
        ("status", "blocked"),
        ("due_date", "not-a-date"),
    ],
)
def test_apply_reuses_task_validation(
    client: TestClient,
    workspace: CreatedWorkspace,
    field: str,
    value: object,
) -> None:
    task = approved_task(1)
    task[field] = value

    response = client.post(
        "/api/v1/ai/project-plan/apply",
        headers=workspace.owner.headers,
        json=apply_payload(workspace.id, tasks=[task]),
    )

    assert response.status_code == 422


def test_apply_rejects_invalid_project_and_extra_fields(
    client: TestClient,
    workspace: CreatedWorkspace,
) -> None:
    invalid_project = apply_payload(workspace.id)
    invalid_project["project"] = {"name": "", "description": None}
    extra = apply_payload(workspace.id)
    extra["owner_id"] = str(workspace.owner.id)

    assert (
        client.post(
            "/api/v1/ai/project-plan/apply",
            headers=workspace.owner.headers,
            json=invalid_project,
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v1/ai/project-plan/apply",
            headers=workspace.owner.headers,
            json=extra,
        ).status_code
        == 422
    )
