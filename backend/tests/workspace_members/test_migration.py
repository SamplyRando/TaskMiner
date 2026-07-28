import os
from pathlib import Path
import subprocess
import sys
from uuid import UUID, uuid4

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url


BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]
PRE_MEMBERS_REVISION = "8e2b6f4a9c1d"


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


def test_members_migration_backfills_owners_and_downgrades() -> None:
    base_url = make_url(os.environ["TEST_DATABASE_URL"])
    database_name = f"taskminer_members_migration_test_{uuid4().hex}"
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
        run_alembic(migration_url, "upgrade", PRE_MEMBERS_REVISION)

        first_user_id = uuid4()
        second_user_id = uuid4()
        first_workspace_id = uuid4()
        second_workspace_id = uuid4()
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
                    INSERT INTO workspaces (id, name, owner_id) VALUES
                        (:first_workspace, 'First Workspace', :first_owner),
                        (:second_workspace, 'Second Workspace', :second_owner)
                    """
                ),
                {
                    "first_workspace": first_workspace_id,
                    "first_owner": first_user_id,
                    "second_workspace": second_workspace_id,
                    "second_owner": second_user_id,
                },
            )

        run_alembic(migration_url, "upgrade", "head")

        with migration_engine.connect() as connection:
            members = connection.execute(
                text(
                    """
                    SELECT workspace_id, user_id, role
                    FROM workspace_members
                    ORDER BY workspace_id
                    """
                )
            ).all()

        assert len(members) == 2
        assert {
            UUID(str(member.workspace_id)): (
                UUID(str(member.user_id)),
                member.role,
            )
            for member in members
        } == {
            first_workspace_id: (first_user_id, "owner"),
            second_workspace_id: (second_user_id, "owner"),
        }
        unique_constraints = inspect(migration_engine).get_unique_constraints(
            "workspace_members"
        )
        assert any(
            constraint["name"] == "uq_workspace_members_workspace_user"
            for constraint in unique_constraints
        )

        run_alembic(migration_url, "downgrade", PRE_MEMBERS_REVISION)

        downgraded_inspector = inspect(migration_engine)
        assert "workspace_members" not in downgraded_inspector.get_table_names()
        with migration_engine.connect() as connection:
            enum_exists = connection.scalar(
                text(
                    """
                    SELECT EXISTS (
                        SELECT 1 FROM pg_type
                        WHERE typname = 'workspace_member_role'
                    )
                    """
                )
            )
            workspace_count = connection.scalar(text("SELECT count(*) FROM workspaces"))
        assert enum_exists is False
        assert workspace_count == 2
    finally:
        migration_engine.dispose()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(
                f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)'
            )
        admin_engine.dispose()
