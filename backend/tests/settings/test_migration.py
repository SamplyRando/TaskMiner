import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url


BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]
PRE_SETTINGS_REVISION = "f1b2c3d4e5a6"


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


def test_settings_migration_backfills_and_downgrades() -> None:
    base_url = make_url(os.environ["TEST_DATABASE_URL"])
    database_name = f"taskminer_settings_migration_test_{uuid4().hex}"
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
        run_alembic(migration_url, "upgrade", PRE_SETTINGS_REVISION)
        user_id = uuid4()
        with migration_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO users (
                        id, email, hashed_password, full_name, is_active
                    ) VALUES (
                        :id, :email, 'hash', 'Settings User', true
                    )
                    """
                ),
                {"id": user_id, "email": f"{user_id}@example.com"},
            )

        run_alembic(migration_url, "upgrade", "head")
        inspector = inspect(migration_engine)
        assert "user_preferences" in inspector.get_table_names()
        assert {
            "avatar_url",
            "last_login_at",
            "deleted_at",
            "auth_version",
        }.issubset({column["name"] for column in inspector.get_columns("users")})
        with migration_engine.connect() as connection:
            preference = connection.execute(
                text(
                    """
                    SELECT theme, motion, items_per_page, dashboard_period, accent
                    FROM user_preferences WHERE user_id = :user_id
                    """
                ),
                {"user_id": user_id},
            ).one()
        assert tuple(preference) == ("system", "full", 20, 30, "violet")

        run_alembic(migration_url, "downgrade", PRE_SETTINGS_REVISION)
        downgraded = inspect(migration_engine)
        assert "user_preferences" not in downgraded.get_table_names()
        assert "avatar_url" not in {
            column["name"] for column in downgraded.get_columns("users")
        }
    finally:
        migration_engine.dispose()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(
                f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)'
            )
        admin_engine.dispose()
