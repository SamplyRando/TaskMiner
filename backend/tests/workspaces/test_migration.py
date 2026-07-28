import os
from pathlib import Path
import subprocess
import sys
from uuid import UUID, uuid4

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url


BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]
PRE_WORKSPACE_REVISION = "4c7d2a9e1f5b"


def run_alembic(database_url: str, revision: str) -> None:
    environment = os.environ.copy()
    environment["DATABASE_URL"] = database_url
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", revision],
        cwd=BACKEND_DIRECTORY,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr


def run_alembic_downgrade(database_url: str, revision: str) -> None:
    environment = os.environ.copy()
    environment["DATABASE_URL"] = database_url
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "downgrade", revision],
        cwd=BACKEND_DIRECTORY,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr


def test_workspace_migration_backfills_projects_and_downgrades() -> None:
    base_url = make_url(os.environ["TEST_DATABASE_URL"])
    database_name = f"taskminer_migration_test_{uuid4().hex}"
    admin_url = base_url.set(database="postgres")
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    migration_url = base_url.set(database=database_name).render_as_string(
        hide_password=False
    )
    migration_engine = create_engine(migration_url)

    with admin_engine.connect() as connection:
        connection.exec_driver_sql(f'CREATE DATABASE "{database_name}"')

    try:
        run_alembic(migration_url, PRE_WORKSPACE_REVISION)

        first_user_id = uuid4()
        second_user_id = uuid4()
        first_project_id = uuid4()
        second_project_id = uuid4()
        with migration_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO users (
                        id, email, hashed_password, full_name, is_active
                    ) VALUES
                        (:first_id, :first_email, 'hash', 'First User', true),
                        (:second_id, :second_email, 'hash', 'Second User', true)
                    """
                ),
                {
                    "first_id": first_user_id,
                    "first_email": f"{first_user_id}@example.com",
                    "second_id": second_user_id,
                    "second_email": f"{second_user_id}@example.com",
                },
            )
            connection.execute(
                text(
                    """
                    INSERT INTO projects (id, name, owner_id) VALUES
                        (:first_project, 'First Project', :first_owner),
                        (:second_project, 'Second Project', :second_owner)
                    """
                ),
                {
                    "first_project": first_project_id,
                    "first_owner": first_user_id,
                    "second_project": second_project_id,
                    "second_owner": second_user_id,
                },
            )

        run_alembic(migration_url, "head")

        upgraded_inspector = inspect(migration_engine)
        project_columns = {
            column["name"]: column
            for column in upgraded_inspector.get_columns("projects")
        }
        assert "owner_id" not in project_columns
        assert project_columns["workspace_id"]["nullable"] is False

        with migration_engine.connect() as connection:
            workspaces = connection.execute(
                text("SELECT owner_id, name FROM workspaces ORDER BY owner_id")
            ).all()
            project_owners = connection.execute(
                text(
                    """
                    SELECT projects.id, workspaces.owner_id
                    FROM projects
                    JOIN workspaces ON workspaces.id = projects.workspace_id
                    """
                )
            ).all()

        assert len(workspaces) == 2
        assert {UUID(str(row.owner_id)) for row in workspaces} == {
            first_user_id,
            second_user_id,
        }
        assert {row.name for row in workspaces} == {"My Workspace"}
        assert {
            UUID(str(row.id)): UUID(str(row.owner_id)) for row in project_owners
        } == {
            first_project_id: first_user_id,
            second_project_id: second_user_id,
        }

        run_alembic_downgrade(migration_url, PRE_WORKSPACE_REVISION)

        downgraded_inspector = inspect(migration_engine)
        downgraded_columns = {
            column["name"]: column
            for column in downgraded_inspector.get_columns("projects")
        }
        assert "workspace_id" not in downgraded_columns
        assert downgraded_columns["owner_id"]["nullable"] is False
        assert "workspaces" not in downgraded_inspector.get_table_names()

        with migration_engine.connect() as connection:
            restored_owners = connection.execute(
                text("SELECT id, owner_id FROM projects")
            ).all()
        assert {
            UUID(str(row.id)): UUID(str(row.owner_id)) for row in restored_owners
        } == {
            first_project_id: first_user_id,
            second_project_id: second_user_id,
        }
    finally:
        migration_engine.dispose()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(
                f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)'
            )
        admin_engine.dispose()
