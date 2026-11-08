import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url


BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]
PREVIOUS_REVISION = "e5f9a2b8d3c1"


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


def test_google_auth_migration_is_additive_and_downgrades() -> None:
    base_url = make_url(os.environ["TEST_DATABASE_URL"])
    database_name = f"taskminer_google_auth_migration_test_{uuid4().hex}"
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
        run_alembic(migration_url, "upgrade", PREVIOUS_REVISION)
        user_id = uuid4()
        with migration_engine.begin() as connection:
            connection.execute(
                text(
                    "INSERT INTO users (id, email, hashed_password, full_name, "
                    "is_active) VALUES (:id, :email, 'hash', 'Existing', true)"
                ),
                {"id": user_id, "email": f"{user_id}@example.com"},
            )

        run_alembic(migration_url, "upgrade", "head")
        inspector = inspect(migration_engine)
        assert {
            "external_auth_attempts",
            "external_auth_identities",
        } <= set(inspector.get_table_names())
        assert {
            "ix_external_auth_attempts_expires_consumed",
            "ix_external_auth_attempts_nonce_hash",
            "ix_external_auth_attempts_user_id",
        } <= {
            index["name"] for index in inspector.get_indexes("external_auth_attempts")
        }
        assert "ix_external_auth_identities_user_id" in {
            index["name"] for index in inspector.get_indexes("external_auth_identities")
        }
        with migration_engine.connect() as connection:
            assert (
                connection.scalar(
                    text("SELECT count(*) FROM users WHERE id = :id"),
                    {"id": user_id},
                )
                == 1
            )

        run_alembic(migration_url, "downgrade", PREVIOUS_REVISION)
        downgraded_tables = set(inspect(migration_engine).get_table_names())
        assert "external_auth_attempts" not in downgraded_tables
        assert "external_auth_identities" not in downgraded_tables
    finally:
        migration_engine.dispose()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(
                f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)'
            )
        admin_engine.dispose()
