from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.events import (
    ActivityEventType,
    ActivityResourceType,
    DomainEvent,
    publish,
)
from app.models.activity import Activity
from app.models.audit_log import AuditLog
from tests.factories import CreatedWorkspace


def test_audit_listener_persists_complete_domain_event(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
) -> None:
    del client
    resource_id = uuid4()
    publish(
        DomainEvent(
            event_type=ActivityEventType.PROJECT_UPDATED,
            resource_type=ActivityResourceType.PROJECT,
            workspace_id=workspace.id,
            resource_id=resource_id,
            actor_id=workspace.owner.id,
            old_values={"name": "Before"},
            new_values={"name": "After"},
            metadata={"fields": ["name"]},
        )
    )

    audit_log = database_session.scalar(
        select(AuditLog).where(AuditLog.resource_id == resource_id)
    )

    assert audit_log is not None
    assert audit_log.event_type == ActivityEventType.PROJECT_UPDATED
    assert audit_log.resource_type == ActivityResourceType.PROJECT
    assert audit_log.old_values == {"name": "Before"}
    assert audit_log.new_values == {"name": "After"}
    assert audit_log.audit_metadata == {"fields": ["name"]}


def test_activity_and_audit_listeners_are_independent_consumers(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
) -> None:
    del client
    publish(
        DomainEvent(
            event_type=ActivityEventType.WORKSPACE_UPDATED,
            resource_type=ActivityResourceType.WORKSPACE,
            workspace_id=workspace.id,
            resource_id=workspace.id,
            actor_id=None,
            metadata={"source": "test"},
        )
    )

    activity_count = database_session.scalar(select(func.count(Activity.id)))
    audit_count = database_session.scalar(select(func.count(AuditLog.id)))

    assert activity_count == 1
    assert audit_count == 1


def test_audit_listener_supports_nullable_actor(
    client: TestClient,
    workspace: CreatedWorkspace,
    database_session: Session,
) -> None:
    del client
    resource_id = uuid4()
    publish(
        DomainEvent(
            event_type=ActivityEventType.WORKSPACE_CREATED,
            resource_type=ActivityResourceType.WORKSPACE,
            workspace_id=workspace.id,
            resource_id=resource_id,
            actor_id=None,
        )
    )

    audit_log = database_session.scalar(
        select(AuditLog).where(AuditLog.resource_id == resource_id)
    )

    assert audit_log is not None
    assert audit_log.actor_id is None
    assert audit_log.old_values is None
    assert audit_log.new_values is None
    assert audit_log.audit_metadata == {}
