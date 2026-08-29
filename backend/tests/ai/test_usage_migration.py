import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

from sqlalchemy import create_engine, inspect
from sqlalchemy.engine import make_url


BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]
PRE_AI_USAGE_REVISION = "c8f4a2d7e1b9"


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


def test_ai_usage_migration_upgrades_and_downgrades() -> None:
    base_url = make_url(os.environ["TEST_DATABASE_URL"])
    database_name = f"taskminer_ai_usage_migration_test_{uuid4().hex}"
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
        run_alembic(migration_url, "upgrade", PRE_AI_USAGE_REVISION)
        run_alembic(migration_url, "upgrade", "head")

        inspector = inspect(migration_engine)
        assert "ai_usage_events" in inspector.get_table_names()
        assert {
            column["name"] for column in inspector.get_columns("ai_usage_events")
        } == {
            "id",
            "workspace_id",
            "user_id",
            "operation_type",
            "provider",
            "model",
            "status",
            "input_tokens",
            "output_tokens",
            "total_tokens",
            "estimated_cost_usd",
            "latency_ms",
            "error_code",
            "created_at",
        }
        indexes = {index["name"] for index in inspector.get_indexes("ai_usage_events")}
        assert {
            "ix_ai_usage_events_workspace_id",
            "ix_ai_usage_events_user_id",
            "ix_ai_usage_events_created_at",
            "ix_ai_usage_events_status",
            "ix_ai_usage_events_operation_type",
            "ix_ai_usage_events_workspace_created",
            "ix_ai_usage_events_user_created",
        } <= indexes

        run_alembic(migration_url, "downgrade", PRE_AI_USAGE_REVISION)
        assert "ai_usage_events" not in inspect(migration_engine).get_table_names()
    finally:
        migration_engine.dispose()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(
                f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)'
            )
        admin_engine.dispose()
