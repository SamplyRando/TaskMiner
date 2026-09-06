import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

from sqlalchemy import create_engine, inspect
from sqlalchemy.engine import make_url


BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]
PRE_STRIPE_REVISION = "3e8a1c7d5b9f"


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


def test_stripe_billing_migration_upgrades_and_downgrades() -> None:
    base_url = make_url(os.environ["TEST_DATABASE_URL"])
    database_name = f"taskminer_stripe_migration_test_{uuid4().hex}"
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
        run_alembic(migration_url, "upgrade", PRE_STRIPE_REVISION)
        run_alembic(migration_url, "upgrade", "head")

        inspector = inspect(migration_engine)
        assert "stripe_webhook_events" in inspector.get_table_names()
        subscription_columns = {
            column["name"]
            for column in inspector.get_columns("workspace_subscriptions")
        }
        assert {
            "stripe_customer_id",
            "stripe_subscription_id",
            "stripe_price_id",
            "stripe_event_created_at",
            "cancel_at",
        } <= subscription_columns
        subscription_uniques = {
            constraint["name"]
            for constraint in inspector.get_unique_constraints(
                "workspace_subscriptions"
            )
        }
        assert {
            "uq_workspace_subscriptions_stripe_customer_id",
            "uq_workspace_subscriptions_stripe_subscription_id",
        } <= subscription_uniques
        event_uniques = {
            constraint["name"]
            for constraint in inspector.get_unique_constraints("stripe_webhook_events")
        }
        assert "uq_stripe_webhook_events_event_id" in event_uniques

        run_alembic(migration_url, "downgrade", PRE_STRIPE_REVISION)
        inspector = inspect(migration_engine)
        assert "stripe_webhook_events" not in inspector.get_table_names()
        subscription_columns = {
            column["name"]
            for column in inspector.get_columns("workspace_subscriptions")
        }
        assert "stripe_customer_id" not in subscription_columns
        assert "cancel_at" not in subscription_columns
    finally:
        migration_engine.dispose()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(
                f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)'
            )
        admin_engine.dispose()
