import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url


BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]
PRE_UNACCENT_REVISION = "a3e7c1d9f5b2"


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


def test_unaccent_migration_upgrades_and_downgrades() -> None:
    base_url = make_url(os.environ["TEST_DATABASE_URL"])
    database_name = f"taskminer_unaccent_migration_test_{uuid4().hex}"
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
        run_alembic(migration_url, "upgrade", PRE_UNACCENT_REVISION)
        with migration_engine.connect() as connection:
            extension_before = connection.scalar(
                text("SELECT extname FROM pg_extension WHERE extname = 'unaccent'")
            )
        assert extension_before is None

        run_alembic(migration_url, "upgrade", "head")
        with migration_engine.connect() as connection:
            assert connection.scalar(text("SELECT unaccent('résumé')")) == "resume"

        run_alembic(migration_url, "downgrade", PRE_UNACCENT_REVISION)
        with migration_engine.connect() as connection:
            extension_after = connection.scalar(
                text("SELECT extname FROM pg_extension WHERE extname = 'unaccent'")
            )
        assert extension_after is None
    finally:
        migration_engine.dispose()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(
                f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)'
            )
        admin_engine.dispose()
