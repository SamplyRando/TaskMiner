import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

from sqlalchemy import create_engine, inspect
from sqlalchemy.engine import make_url


BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]
PRE_AI_APPLY_REVISION = "c3d9e1f7a2b4"


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


def test_ai_plan_application_migration_upgrades_and_downgrades() -> None:
    base_url = make_url(os.environ["TEST_DATABASE_URL"])
    database_name = f"taskminer_ai_apply_migration_test_{uuid4().hex}"
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
        run_alembic(migration_url, "upgrade", PRE_AI_APPLY_REVISION)
        run_alembic(migration_url, "upgrade", "head")

        inspector = inspect(migration_engine)
        assert "ai_plan_applications" in inspector.get_table_names()
        assert {
            column["name"] for column in inspector.get_columns("ai_plan_applications")
        } == {
            "id",
            "user_id",
            "workspace_id",
            "idempotency_key",
            "request_hash",
            "project_id",
            "created_project",
            "created_task_ids",
            "skipped_task_count",
            "created_at",
        }
        unique_constraints = inspector.get_unique_constraints("ai_plan_applications")
        assert {constraint["name"] for constraint in unique_constraints} == {
            "uq_ai_plan_applications_user_workspace_key"
        }

        run_alembic(migration_url, "downgrade", PRE_AI_APPLY_REVISION)
        assert "ai_plan_applications" not in inspect(migration_engine).get_table_names()
    finally:
        migration_engine.dispose()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(
                f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)'
            )
        admin_engine.dispose()
