import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url


BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]
PRE_ACTIVITY_REVISION = "7c4e1a9b2d6f"


def run_alembic(database_url: str, command: str, revision: str) -> None:
    environment = os.environ.copy()
    environment["DATABASE_URL"] = database_url
    result = subprocess.run(
        [sys.executable, "-m", "alembic", command, revision],
        cwd=BACKEND_DIRECTORY,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr


def enum_labels(database_url: str, enum_name: str) -> list[str]:
    engine = create_engine(database_url)
    try:
        with engine.connect() as connection:
            return list(
                connection.scalars(
                    text(
                        """
                        SELECT enumlabel
                        FROM pg_enum
                        JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
                        WHERE pg_type.typname = :enum_name
                        ORDER BY enumsortorder
                        """
                    ),
                    {"enum_name": enum_name},
                ).all()
            )
    finally:
        engine.dispose()


def test_activity_migration_upgrades_and_downgrades() -> None:
    base_url = make_url(os.environ["TEST_DATABASE_URL"])
    database_name = f"taskminer_activity_migration_test_{uuid4().hex}"
    admin_engine = create_engine(
        base_url.set(database="postgres"),
        isolation_level="AUTOCOMMIT",
    )
    migration_url = base_url.set(database=database_name).render_as_string(
        hide_password=False
    )
    migration_engine = create_engine(migration_url)

    with admin_engine.connect() as connection:
        connection.exec_driver_sql(f'CREATE DATABASE "{database_name}"')

    try:
        run_alembic(migration_url, "upgrade", PRE_ACTIVITY_REVISION)
        user_id = uuid4()
        workspace_id = uuid4()
        with migration_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO users (
                        id, email, hashed_password, full_name, is_active
                    ) VALUES (
                        :user_id, :email, 'hash', 'Activity User', true
                    )
                    """
                ),
                {
                    "user_id": user_id,
                    "email": f"{user_id}@example.com",
                },
            )
            connection.execute(
                text(
                    """
                    INSERT INTO workspaces (id, name, owner_id)
                    VALUES (:workspace_id, 'Activity Workspace', :user_id)
                    """
                ),
                {"workspace_id": workspace_id, "user_id": user_id},
            )

        run_alembic(migration_url, "upgrade", "head")

        inspector = inspect(migration_engine)
        assert "activities" in inspector.get_table_names()
        assert {column["name"] for column in inspector.get_columns("activities")} == {
            "id",
            "workspace_id",
            "actor_id",
            "event_type",
            "resource_type",
            "resource_id",
            "metadata",
            "created_at",
        }
        indexes = {index["name"] for index in inspector.get_indexes("activities")}
        assert indexes == {
            "ix_activities_actor_id",
            "ix_activities_created_at",
            "ix_activities_event_type",
            "ix_activities_workspace_id",
        }
        foreign_keys = {
            tuple(foreign_key["constrained_columns"]): foreign_key
            for foreign_key in inspector.get_foreign_keys("activities")
        }
        assert foreign_keys[("workspace_id",)]["options"]["ondelete"] == "CASCADE"
        assert foreign_keys[("actor_id",)]["options"]["ondelete"] == "SET NULL"
        assert enum_labels(migration_url, "activity_event_type") == [
            "workspace_created",
            "workspace_updated",
            "project_created",
            "project_updated",
            "project_deleted",
            "task_created",
            "task_updated",
            "task_deleted",
            "task_assigned",
            "comment_created",
            "attachment_uploaded",
            "invitation_created",
            "invitation_accepted",
            "member_role_updated",
        ]
        assert enum_labels(migration_url, "activity_resource_type") == [
            "workspace",
            "project",
            "task",
            "comment",
            "attachment",
            "invitation",
            "member",
        ]

        activity_id = uuid4()
        with migration_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO activities (
                        id, workspace_id, actor_id, event_type,
                        resource_type, resource_id, metadata
                    ) VALUES (
                        :id, :workspace_id, :actor_id, 'task_created',
                        'task', :resource_id, CAST(:metadata AS jsonb)
                    )
                    """
                ),
                {
                    "id": activity_id,
                    "workspace_id": workspace_id,
                    "actor_id": user_id,
                    "resource_id": uuid4(),
                    "metadata": '{"title": "Migration task"}',
                },
            )
        with migration_engine.connect() as connection:
            activity = connection.execute(
                text(
                    """
                    SELECT event_type, resource_type, metadata
                    FROM activities WHERE id = :id
                    """
                ),
                {"id": activity_id},
            ).one()
        assert activity.event_type == "task_created"
        assert activity.resource_type == "task"
        assert activity.metadata == {"title": "Migration task"}

        run_alembic(migration_url, "downgrade", PRE_ACTIVITY_REVISION)

        downgraded_inspector = inspect(migration_engine)
        assert "activities" not in downgraded_inspector.get_table_names()
        with migration_engine.connect() as connection:
            enum_count = connection.scalar(
                text(
                    """
                    SELECT count(*) FROM pg_type
                    WHERE typname IN (
                        'activity_event_type', 'activity_resource_type'
                    )
                    """
                )
            )
            workspace_count = connection.scalar(text("SELECT count(*) FROM workspaces"))
        assert enum_count == 0
        assert workspace_count == 1
    finally:
        migration_engine.dispose()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(
                f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)'
            )
        admin_engine.dispose()
