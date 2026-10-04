import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url


BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]
PREVIOUS_REVISION = "d4e8f1a7c2b9"


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


def test_project_workflow_migration_preserves_existing_task_meaning() -> None:
    base_url = make_url(os.environ["TEST_DATABASE_URL"])
    database_name = f"taskminer_workflow_migration_test_{uuid4().hex}"
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
        user_id = uuid4()
        workspace_id = uuid4()
        project_id = uuid4()
        with migration_engine.begin() as connection:
            connection.execute(
                text(
                    "INSERT INTO users (id, email, hashed_password, full_name, is_active) "
                    "VALUES (:id, :email, 'hash', 'Owner', true)"
                ),
                {"id": user_id, "email": f"{user_id}@example.com"},
            )
            connection.execute(
                text(
                    "INSERT INTO workspaces (id, name, owner_id) "
                    "VALUES (:id, 'Workspace', :owner_id)"
                ),
                {"id": workspace_id, "owner_id": user_id},
            )
            connection.execute(
                text(
                    "INSERT INTO projects (id, name, workspace_id) "
                    "VALUES (:id, 'Project', :workspace_id)"
                ),
                {"id": project_id, "workspace_id": workspace_id},
            )
            for status in ("todo", "in_progress", "done"):
                connection.execute(
                    text(
                        "INSERT INTO tasks (id, title, status, priority, project_id) "
                        "VALUES (:id, :title, CAST(:status AS task_status), "
                        "'medium', :project_id)"
                    ),
                    {
                        "id": uuid4(),
                        "title": status,
                        "status": status,
                        "project_id": project_id,
                    },
                )

        run_alembic(migration_url, "upgrade", "head")
        inspector = inspect(migration_engine)
        assert "project_task_statuses" in inspector.get_table_names()
        task_columns = {
            column["name"]: column for column in inspector.get_columns("tasks")
        }
        assert task_columns["status"]["type"].__class__.__name__ != "ENUM"
        with migration_engine.connect() as connection:
            statuses = connection.execute(
                text(
                    "SELECT key, position, is_completed "
                    "FROM project_task_statuses WHERE project_id = :project_id "
                    "ORDER BY position"
                ),
                {"project_id": project_id},
            ).all()
            tasks = connection.execute(
                text("SELECT title, status FROM tasks ORDER BY title")
            ).all()
        assert statuses == [
            ("todo", 0, False),
            ("in_progress", 1, False),
            ("done", 2, True),
        ]
        assert {row.title: row.status for row in tasks} == {
            "done": "done",
            "in_progress": "in_progress",
            "todo": "todo",
        }

        run_alembic(migration_url, "downgrade", PREVIOUS_REVISION)
        assert (
            "project_task_statuses" not in inspect(migration_engine).get_table_names()
        )
    finally:
        migration_engine.dispose()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(
                f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)'
            )
        admin_engine.dispose()
