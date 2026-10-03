import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

from sqlalchemy import create_engine, inspect
from sqlalchemy.engine import make_url


BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]
PRE_NOTIFICATION_REVISION = "b5c9e2f7a4d1"


def run_alembic(database_url: str, *arguments: str) -> None:
    environment = os.environ.copy()
    environment["DATABASE_URL"] = database_url
    result = subprocess.run(
        [sys.executable, "-m", "alembic", *arguments],
        cwd=BACKEND_DIRECTORY,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr


def test_notification_migration_upgrades_and_downgrades() -> None:
    base_url = make_url(os.environ["TEST_DATABASE_URL"])
    database_name = f"taskminer_notification_migration_test_{uuid4().hex}"
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
        run_alembic(migration_url, "upgrade", PRE_NOTIFICATION_REVISION)
        assert "notifications" not in inspect(migration_engine).get_table_names()

        run_alembic(migration_url, "upgrade", "head")
        inspector = inspect(migration_engine)
        columns = {
            column["name"]: column for column in inspector.get_columns("notifications")
        }
        assert set(columns) == {
            "id",
            "workspace_id",
            "recipient_user_id",
            "actor_user_id",
            "type",
            "title",
            "message",
            "entity_type",
            "entity_id",
            "source_event_id",
            "read_at",
            "created_at",
        }
        assert columns["read_at"]["nullable"] is True
        assert columns["actor_user_id"]["nullable"] is True
        index_names = {
            index["name"] for index in inspector.get_indexes("notifications")
        }
        assert {
            "ix_notifications_recipient_created_at",
            "ix_notifications_recipient_read_created",
            "ix_notifications_workspace_id",
        }.issubset(index_names)
        unique_names = {
            constraint["name"]
            for constraint in inspector.get_unique_constraints("notifications")
        }
        assert "uq_notifications_source_recipient_type" in unique_names

        run_alembic(migration_url, "downgrade", PRE_NOTIFICATION_REVISION)
        assert "notifications" not in inspect(migration_engine).get_table_names()
    finally:
        migration_engine.dispose()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(
                f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)'
            )
        admin_engine.dispose()
