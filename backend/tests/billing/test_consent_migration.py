import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

from sqlalchemy import create_engine, inspect
from sqlalchemy.engine import make_url


BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]
PRE_CONSENT_REVISION = "e9c2a7b4d6f1"


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


def test_billing_checkout_consent_migration_upgrades_and_downgrades() -> None:
    base_url = make_url(os.environ["TEST_DATABASE_URL"])
    database_name = f"taskminer_billing_consent_migration_test_{uuid4().hex}"
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
        run_alembic(migration_url, "upgrade", PRE_CONSENT_REVISION)
        run_alembic(migration_url, "upgrade", "head")

        inspector = inspect(migration_engine)
        assert "billing_checkout_consents" in inspector.get_table_names()
        columns = {
            column["name"]
            for column in inspector.get_columns("billing_checkout_consents")
        }
        assert columns == {
            "accepted_at",
            "checkout_attempt_id",
            "consent_type",
            "id",
            "text_version",
            "user_id",
            "workspace_id",
        }
        unique_constraints = {
            constraint["name"]
            for constraint in inspector.get_unique_constraints(
                "billing_checkout_consents"
            )
        }
        assert "uq_billing_checkout_consents_attempt_type" in unique_constraints
        indexes = {
            index["name"]
            for index in inspector.get_indexes("billing_checkout_consents")
        }
        assert {
            "ix_billing_checkout_consents_user_id",
            "ix_billing_checkout_consents_workspace_accepted",
        } <= indexes

        run_alembic(migration_url, "downgrade", PRE_CONSENT_REVISION)
        assert (
            "billing_checkout_consents"
            not in inspect(migration_engine).get_table_names()
        )
    finally:
        migration_engine.dispose()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(
                f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)'
            )
        admin_engine.dispose()
