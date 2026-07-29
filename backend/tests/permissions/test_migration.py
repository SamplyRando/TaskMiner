import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url


BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]
PRE_ROLES_REVISION = "1b7e4d9c6a2f"


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


def enum_labels(database_url: str) -> list[str]:
    engine = create_engine(database_url)
    try:
        with engine.connect() as connection:
            return list(
                connection.scalars(
                    text(
                        """
                        SELECT enumlabel
                        FROM pg_enum
                        JOIN pg_type ON pg_type.oid = pg_enum.enumtypid
                        WHERE pg_type.typname = 'workspace_member_role'
                        ORDER BY enumsortorder
                        """
                    )
                ).all()
            )
    finally:
        engine.dispose()


def test_role_migration_preserves_members_and_downgrades() -> None:
    base_url = make_url(os.environ["TEST_DATABASE_URL"])
    database_name = f"taskminer_roles_migration_test_{uuid4().hex}"
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
        run_alembic(migration_url, "upgrade", PRE_ROLES_REVISION)

        user_id = uuid4()
        workspace_id = uuid4()
        member_id = uuid4()
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
            connection.execute(
                text(
                    """
                    INSERT INTO workspace_members (
                        id, workspace_id, user_id, role
                    ) VALUES (
                        :member_id, :workspace_id, :user_id, 'owner'
                    )
                    """
                ),
                {
                    "member_id": member_id,
                    "workspace_id": workspace_id,
                    "user_id": user_id,
                },
            )

        run_alembic(migration_url, "upgrade", "head")

        assert enum_labels(migration_url) == [
            "owner",
            "admin",
            "member",
            "viewer",
        ]
        with migration_engine.begin() as connection:
            preserved_role = connection.scalar(
                text("SELECT role FROM workspace_members WHERE id = :member_id"),
                {"member_id": member_id},
            )
            connection.execute(
                text(
                    """
                    UPDATE workspace_members
                    SET role = 'admin'
                    WHERE id = :member_id
                    """
                ),
                {"member_id": member_id},
            )
        assert preserved_role == "owner"

        run_alembic(migration_url, "downgrade", PRE_ROLES_REVISION)

        assert enum_labels(migration_url) == ["owner"]
        with migration_engine.connect() as connection:
            downgraded_role = connection.scalar(
                text("SELECT role FROM workspace_members WHERE id = :member_id"),
                {"member_id": member_id},
            )
            member_count = connection.scalar(
                text("SELECT count(*) FROM workspace_members")
            )
        assert downgraded_role == "owner"
        assert member_count == 1
    finally:
        migration_engine.dispose()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(
                f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)'
            )
        admin_engine.dispose()
