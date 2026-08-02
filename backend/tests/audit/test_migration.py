import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url


BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]
PRE_AUDIT_REVISION = "a8d3f6b1c4e7"


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


def test_audit_migration_upgrades_and_downgrades() -> None:
    base_url = make_url(os.environ["TEST_DATABASE_URL"])
    database_name = f"taskminer_audit_migration_test_{uuid4().hex}"
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
        run_alembic(migration_url, "upgrade", PRE_AUDIT_REVISION)
        user_id = uuid4()
        workspace_id = uuid4()
        with migration_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO users (
                        id, email, hashed_password, full_name, is_active
                    ) VALUES (
                        :user_id, :email, 'hash', 'Audit User', true
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
                    VALUES (:workspace_id, 'Audit Workspace', :user_id)
                    """
                ),
                {"workspace_id": workspace_id, "user_id": user_id},
            )

        run_alembic(migration_url, "upgrade", "head")

        inspector = inspect(migration_engine)
        assert "audit_logs" in inspector.get_table_names()
        assert {column["name"] for column in inspector.get_columns("audit_logs")} == {
            "id",
            "workspace_id",
            "actor_id",
            "event_type",
            "resource_type",
            "resource_id",
            "old_values",
            "new_values",
            "metadata",
            "success",
            "created_at",
        }
        assert {index["name"] for index in inspector.get_indexes("audit_logs")} == {
            "ix_audit_logs_actor_id",
            "ix_audit_logs_created_at",
            "ix_audit_logs_event_type",
            "ix_audit_logs_resource_type",
            "ix_audit_logs_success",
            "ix_audit_logs_workspace_id",
        }
        foreign_keys = {
            tuple(foreign_key["constrained_columns"]): foreign_key
            for foreign_key in inspector.get_foreign_keys("audit_logs")
        }
        assert foreign_keys[("workspace_id",)]["options"]["ondelete"] == "CASCADE"
        assert foreign_keys[("actor_id",)]["options"]["ondelete"] == "SET NULL"

        audit_id = uuid4()
        resource_id = uuid4()
        with migration_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO audit_logs (
                        id, workspace_id, actor_id, event_type, resource_type,
                        resource_id, old_values, new_values, metadata
                    ) VALUES (
                        :id, :workspace_id, :actor_id, 'task_updated', 'task',
                        :resource_id, CAST(:old_values AS jsonb),
                        CAST(:new_values AS jsonb), CAST(:metadata AS jsonb)
                    )
                    """
                ),
                {
                    "id": audit_id,
                    "workspace_id": workspace_id,
                    "actor_id": user_id,
                    "resource_id": resource_id,
                    "old_values": '{"title": "Before"}',
                    "new_values": '{"title": "After"}',
                    "metadata": '{"fields": ["title"]}',
                },
            )
        with migration_engine.connect() as connection:
            log = connection.execute(
                text(
                    """
                    SELECT event_type, resource_type, old_values,
                           new_values, metadata, success
                    FROM audit_logs WHERE id = :id
                    """
                ),
                {"id": audit_id},
            ).one()
        assert log.event_type == "task_updated"
        assert log.resource_type == "task"
        assert log.old_values == {"title": "Before"}
        assert log.new_values == {"title": "After"}
        assert log.metadata == {"fields": ["title"]}
        assert log.success is True

        run_alembic(migration_url, "downgrade", PRE_AUDIT_REVISION)

        downgraded_inspector = inspect(migration_engine)
        assert "audit_logs" not in downgraded_inspector.get_table_names()
        assert "activities" in downgraded_inspector.get_table_names()
        with migration_engine.connect() as connection:
            shared_enum_count = connection.scalar(
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
        assert shared_enum_count == 2
        assert workspace_count == 1
    finally:
        migration_engine.dispose()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(
                f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)'
            )
        admin_engine.dispose()
