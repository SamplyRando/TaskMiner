import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

from sqlalchemy import create_engine, inspect
from sqlalchemy.engine import make_url


BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]
PREVIOUS_REVISION = "c6d1e4f8a2b9"


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


def test_mentions_and_reminders_migration_upgrades_and_downgrades() -> None:
    base_url = make_url(os.environ["TEST_DATABASE_URL"])
    database_name = f"taskminer_mentions_reminders_test_{uuid4().hex}"
    admin_engine = create_engine(
        base_url.set(database="postgres"), isolation_level="AUTOCOMMIT"
    )
    migration_url = base_url.set(database=database_name).render_as_string(
        hide_password=False
    )
    migration_engine = create_engine(migration_url)
    with admin_engine.connect() as connection:
        connection.exec_driver_sql(f'CREATE DATABASE "{database_name}"')

    try:
        run_alembic(migration_url, "upgrade", PREVIOUS_REVISION)
        previous = inspect(migration_engine)
        assert "comment_mentions" not in previous.get_table_names()
        assert "reminder_deliveries" not in previous.get_table_names()
        assert "due_date" not in {
            column["name"] for column in previous.get_columns("projects")
        }

        run_alembic(migration_url, "upgrade", "head")
        inspector = inspect(migration_engine)
        assert {"comment_mentions", "reminder_deliveries"}.issubset(
            inspector.get_table_names()
        )
        project_columns = {
            column["name"]: column for column in inspector.get_columns("projects")
        }
        assert project_columns["due_date"]["nullable"] is True
        preference_columns = {
            column["name"]: column
            for column in inspector.get_columns("user_preferences")
        }
        assert preference_columns["notify_task_reminders"]["nullable"] is False
        assert preference_columns["notify_project_reminders"]["nullable"] is False
        assert preference_columns["reminder_lead_days"]["nullable"] is False
        unique_names = {
            constraint["name"]
            for constraint in inspector.get_unique_constraints("reminder_deliveries")
        }
        assert "uq_reminder_deliveries_logical_delivery" in unique_names

        run_alembic(migration_url, "downgrade", PREVIOUS_REVISION)
        downgraded = inspect(migration_engine)
        assert "comment_mentions" not in downgraded.get_table_names()
        assert "reminder_deliveries" not in downgraded.get_table_names()
        assert "due_date" not in {
            column["name"] for column in downgraded.get_columns("projects")
        }
    finally:
        migration_engine.dispose()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(
                f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)'
            )
        admin_engine.dispose()
