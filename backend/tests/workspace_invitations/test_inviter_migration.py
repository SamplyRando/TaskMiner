import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url


BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]
PRE_INVITER_REVISION = "d2f7a4c9e1b6"


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


def test_invitation_inviter_migration_backfills_and_downgrades() -> None:
    base_url = make_url(os.environ["TEST_DATABASE_URL"])
    database_name = f"taskminer_inviter_migration_test_{uuid4().hex}"
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
        run_alembic(migration_url, "upgrade", PRE_INVITER_REVISION)

        owner_id = uuid4()
        workspace_id = uuid4()
        invitation_id = uuid4()
        with migration_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO users (
                        id, email, hashed_password, full_name, is_active
                    ) VALUES (
                        :owner_id, :email, 'hash', 'Workspace Owner', true
                    )
                    """
                ),
                {
                    "owner_id": owner_id,
                    "email": f"{owner_id}@example.com",
                },
            )
            connection.execute(
                text(
                    """
                    INSERT INTO workspaces (id, name, owner_id)
                    VALUES (:workspace_id, 'Migration Workspace', :owner_id)
                    """
                ),
                {"workspace_id": workspace_id, "owner_id": owner_id},
            )
            connection.execute(
                text(
                    """
                    INSERT INTO workspace_invitations (
                        id, workspace_id, email, role, token, expires_at
                    ) VALUES (
                        :invitation_id, :workspace_id, :email, 'member',
                        :token, now() + interval '7 days'
                    )
                    """
                ),
                {
                    "invitation_id": invitation_id,
                    "workspace_id": workspace_id,
                    "email": "invitee@example.com",
                    "token": f"migration-token-{invitation_id}",
                },
            )

        run_alembic(migration_url, "upgrade", "head")

        inspector = inspect(migration_engine)
        column_names = {
            column["name"] for column in inspector.get_columns("workspace_invitations")
        }
        assert "invited_by_id" in column_names
        assert "ix_workspace_invitations_invited_by_id" in {
            index["name"] for index in inspector.get_indexes("workspace_invitations")
        }
        invited_by_foreign_key = next(
            foreign_key
            for foreign_key in inspector.get_foreign_keys("workspace_invitations")
            if foreign_key["constrained_columns"] == ["invited_by_id"]
        )
        assert invited_by_foreign_key["referred_table"] == "users"
        assert invited_by_foreign_key["options"]["ondelete"] == "SET NULL"

        with migration_engine.connect() as connection:
            invited_by_id = connection.scalar(
                text(
                    """
                    SELECT invited_by_id
                    FROM workspace_invitations
                    WHERE id = :invitation_id
                    """
                ),
                {"invitation_id": invitation_id},
            )
        assert invited_by_id == owner_id

        run_alembic(migration_url, "downgrade", PRE_INVITER_REVISION)

        downgraded_columns = {
            column["name"]
            for column in inspect(migration_engine).get_columns("workspace_invitations")
        }
        assert "invited_by_id" not in downgraded_columns
        with migration_engine.connect() as connection:
            invitation_count = connection.scalar(
                text("SELECT count(*) FROM workspace_invitations")
            )
        assert invitation_count == 1
    finally:
        migration_engine.dispose()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(
                f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)'
            )
        admin_engine.dispose()
