import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url


BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]
PRE_ACCOUNT_LIFECYCLE_REVISION = "d7a9c3e5f1b2"


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


def test_account_lifecycle_migration_backfills_existing_users_and_downgrades() -> None:
    base_url = make_url(os.environ["TEST_DATABASE_URL"])
    database_name = f"taskminer_account_lifecycle_migration_test_{uuid4().hex}"
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
        run_alembic(
            migration_url,
            "upgrade",
            PRE_ACCOUNT_LIFECYCLE_REVISION,
        )
        existing_user_id = uuid4()
        with migration_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO users (
                        id, email, hashed_password, full_name, is_active
                    ) VALUES (
                        :id, :email, 'hash', 'Existing User', true
                    )
                    """
                ),
                {
                    "id": existing_user_id,
                    "email": f"{existing_user_id}@example.com",
                },
            )

        run_alembic(migration_url, "upgrade", "head")

        inspector = inspect(migration_engine)
        assert "account_action_tokens" in inspector.get_table_names()
        assert "email_verified_at" in {
            column["name"] for column in inspector.get_columns("users")
        }
        token_indexes = {
            index["name"] for index in inspector.get_indexes("account_action_tokens")
        }
        assert {
            "ix_account_action_tokens_expires_at",
            "ix_account_action_tokens_token_hash",
            "ix_account_action_tokens_user_id",
            "ix_account_action_tokens_user_purpose_created",
        } <= token_indexes
        with migration_engine.connect() as connection:
            verified_at = connection.scalar(
                text("SELECT email_verified_at FROM users WHERE id = :user_id"),
                {"user_id": existing_user_id},
            )
        assert verified_at is not None

        run_alembic(
            migration_url,
            "downgrade",
            PRE_ACCOUNT_LIFECYCLE_REVISION,
        )
        downgraded = inspect(migration_engine)
        assert "account_action_tokens" not in downgraded.get_table_names()
        assert "email_verified_at" not in {
            column["name"] for column in downgraded.get_columns("users")
        }
    finally:
        migration_engine.dispose()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(
                f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)'
            )
        admin_engine.dispose()
