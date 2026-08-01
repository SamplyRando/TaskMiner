import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url


BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]
PRE_INVITATIONS_REVISION = "5a9c2e7d4b1f"


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


def test_invitation_migration_upgrades_and_downgrades() -> None:
    base_url = make_url(os.environ["TEST_DATABASE_URL"])
    database_name = f"taskminer_invitations_migration_test_{uuid4().hex}"
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
        run_alembic(migration_url, "upgrade", PRE_INVITATIONS_REVISION)

        user_id = uuid4()
        workspace_id = uuid4()
        with migration_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO users (
                        id, email, hashed_password, full_name, is_active
                    ) VALUES (
                        :user_id, :email, 'hash', 'Migration User', true
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
                    VALUES (:workspace_id, 'Migration Workspace', :user_id)
                    """
                ),
                {"workspace_id": workspace_id, "user_id": user_id},
            )

        run_alembic(migration_url, "upgrade", "head")

        inspector = inspect(migration_engine)
        assert "workspace_invitations" in inspector.get_table_names()
        assert {
            column["name"] for column in inspector.get_columns("workspace_invitations")
        } == {
            "id",
            "workspace_id",
            "invited_by_id",
            "email",
            "role",
            "token",
            "status",
            "expires_at",
            "accepted_at",
            "revoked_at",
            "created_at",
            "updated_at",
        }
        indexes = {
            index["name"]: index
            for index in inspector.get_indexes("workspace_invitations")
        }
        assert indexes["ix_workspace_invitations_token"]["unique"] is True
        assert "ix_workspace_invitations_workspace_id" in indexes
        assert "ix_workspace_invitations_email" in indexes
        assert "ix_workspace_invitations_status" in indexes
        assert "ix_workspace_invitations_invited_by_id" in indexes

        invitation_id = uuid4()
        with migration_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO workspace_invitations (
                        id, workspace_id, email, role, token, expires_at
                    ) VALUES (
                        :id, :workspace_id, :email, 'member', :token,
                        now() + interval '7 days'
                    )
                    """
                ),
                {
                    "id": invitation_id,
                    "workspace_id": workspace_id,
                    "email": "invitee@example.com",
                    "token": "migration-token",
                },
            )
        with migration_engine.connect() as connection:
            invitation = connection.execute(
                text(
                    """
                    SELECT role, status, accepted_at, revoked_at
                    FROM workspace_invitations
                    WHERE id = :id
                    """
                ),
                {"id": invitation_id},
            ).one()
            status_labels = connection.scalars(
                text(
                    """
                    SELECT enumlabel
                    FROM pg_enum
                    JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
                    WHERE pg_type.typname = 'workspace_invitation_status'
                    ORDER BY enumsortorder
                    """
                )
            ).all()
        assert invitation.role == "member"
        assert invitation.status == "pending"
        assert invitation.accepted_at is None
        assert invitation.revoked_at is None
        assert list(status_labels) == ["pending", "accepted", "expired", "revoked"]

        run_alembic(migration_url, "downgrade", PRE_INVITATIONS_REVISION)

        downgraded_inspector = inspect(migration_engine)
        assert "workspace_invitations" not in downgraded_inspector.get_table_names()
        with migration_engine.connect() as connection:
            invitation_enum_exists = connection.scalar(
                text(
                    """
                    SELECT EXISTS (
                        SELECT 1 FROM pg_type
                        WHERE typname = 'workspace_invitation_status'
                    )
                    """
                )
            )
            member_enum_exists = connection.scalar(
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
        assert invitation_enum_exists is False
        assert member_enum_exists is True
        assert workspace_count == 1
    finally:
        migration_engine.dispose()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(
                f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)'
            )
        admin_engine.dispose()
