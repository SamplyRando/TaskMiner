from fastapi.testclient import TestClient
import pytest
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.attachment import Attachment
from tests.factories import (
    AttachmentFactory,
    CreatedAttachment,
    ProjectFactory,
    RegisteredUser,
    TaskFactory,
    UserFactory,
)


def test_foreign_user_cannot_access_attachment_resources(
    client: TestClient,
    attachment: CreatedAttachment,
    other_user: RegisteredUser,
) -> None:
    task_id = attachment.task.id

    upload_response = client.post(
        f"/api/v1/tasks/{task_id}/attachments",
        headers=other_user.headers,
        files={"file": ("foreign.txt", b"foreign", "text/plain")},
    )
    list_response = client.get(
        f"/api/v1/tasks/{task_id}/attachments",
        headers=other_user.headers,
    )
    download_response = client.get(
        f"/api/v1/attachments/{attachment.id}",
        headers=other_user.headers,
    )
    delete_response = client.delete(
        f"/api/v1/attachments/{attachment.id}",
        headers=other_user.headers,
    )

    assert upload_response.status_code == 404
    assert list_response.status_code == 404
    assert download_response.status_code == 404
    assert delete_response.status_code == 404

    owner_response = client.get(
        f"/api/v1/attachments/{attachment.id}",
        headers=attachment.task.project.owner.headers,
    )
    assert owner_response.status_code == 200


def test_deleted_task_hides_attachments_and_rejects_uploads(
    client: TestClient,
    attachment: CreatedAttachment,
    database_session: Session,
) -> None:
    attachment_model = database_session.get(Attachment, attachment.id)
    assert attachment_model is not None
    stored_path = settings.storage_path / attachment_model.stored_filename

    task_delete_response = client.delete(
        f"/api/v1/tasks/{attachment.task.id}",
        headers=attachment.task.project.owner.headers,
    )
    assert task_delete_response.status_code == 204

    upload_response = client.post(
        f"/api/v1/tasks/{attachment.task.id}/attachments",
        headers=attachment.task.project.owner.headers,
        files={"file": ("new.txt", b"new", "text/plain")},
    )
    list_response = client.get(
        f"/api/v1/tasks/{attachment.task.id}/attachments",
        headers=attachment.task.project.owner.headers,
    )
    download_response = client.get(
        f"/api/v1/attachments/{attachment.id}",
        headers=attachment.task.project.owner.headers,
    )
    delete_response = client.delete(
        f"/api/v1/attachments/{attachment.id}",
        headers=attachment.task.project.owner.headers,
    )

    assert upload_response.status_code == 404
    assert list_response.status_code == 404
    assert download_response.status_code == 404
    assert delete_response.status_code == 404
    assert stored_path.is_file()


def test_deleted_project_hides_attachments_and_rejects_uploads(
    client: TestClient,
    attachment: CreatedAttachment,
) -> None:
    project_delete_response = client.delete(
        f"/api/v1/projects/{attachment.task.project.id}",
        headers=attachment.task.project.owner.headers,
    )
    assert project_delete_response.status_code == 204

    upload_response = client.post(
        f"/api/v1/tasks/{attachment.task.id}/attachments",
        headers=attachment.task.project.owner.headers,
        files={"file": ("new.txt", b"new", "text/plain")},
    )
    list_response = client.get(
        f"/api/v1/tasks/{attachment.task.id}/attachments",
        headers=attachment.task.project.owner.headers,
    )
    download_response = client.get(
        f"/api/v1/attachments/{attachment.id}",
        headers=attachment.task.project.owner.headers,
    )
    delete_response = client.delete(
        f"/api/v1/attachments/{attachment.id}",
        headers=attachment.task.project.owner.headers,
    )

    assert upload_response.status_code == 404
    assert list_response.status_code == 404
    assert download_response.status_code == 404
    assert delete_response.status_code == 404


@pytest.mark.parametrize("account_state", ["inactive", "deleted"])
def test_unavailable_user_cannot_access_attachments(
    client: TestClient,
    attachment: CreatedAttachment,
    user_factory: UserFactory,
    account_state: str,
) -> None:
    owner = attachment.task.project.owner
    if account_state == "inactive":
        user_factory.set_active(owner, is_active=False)
    else:
        user_factory.delete(owner)

    response = client.get(
        f"/api/v1/attachments/{attachment.id}",
        headers=owner.headers,
    )

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_attachment_list_is_scoped_to_requested_task(
    client: TestClient,
    user: RegisteredUser,
    project_factory: ProjectFactory,
    task_factory: TaskFactory,
    attachment_factory: AttachmentFactory,
) -> None:
    project = project_factory.create(user)
    first_task = task_factory.create(project)
    second_task = task_factory.create(project)
    first_attachment = attachment_factory.create(first_task)
    attachment_factory.create(second_task)

    response = client.get(
        f"/api/v1/tasks/{first_task.id}/attachments",
        headers=user.headers,
    )

    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [str(first_attachment.id)]
