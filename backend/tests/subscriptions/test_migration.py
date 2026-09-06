import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url


BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]
PRE_SUBSCRIPTION_REVISION = "f4a7c9d2e6b1"


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


def test_subscription_migration_backfills_and_downgrades() -> None:
    base_url = make_url(os.environ["TEST_DATABASE_URL"])
    database_name = f"taskminer_subscription_migration_test_{uuid4().hex}"
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
        run_alembic(migration_url, "upgrade", PRE_SUBSCRIPTION_REVISION)
        user_id = uuid4()
        active_workspace_id = uuid4()
        deleted_workspace_id = uuid4()
        with migration_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO users (
                        id, email, hashed_password, full_name, is_active
                    ) VALUES (:id, :email, 'hash', 'Migration User', true)
                    """
                ),
                {"id": user_id, "email": f"{user_id}@example.com"},
            )
            connection.execute(
                text(
                    """
                    INSERT INTO workspaces (
                        id, name, owner_id, deleted_at
                    ) VALUES
                        (:active_id, 'Active', :owner_id, NULL),
                        (:deleted_id, 'Deleted', :owner_id, now())
                    """
                ),
                {
                    "active_id": active_workspace_id,
                    "deleted_id": deleted_workspace_id,
                    "owner_id": user_id,
                },
            )

        run_alembic(migration_url, "upgrade", "head")

        inspector = inspect(migration_engine)
        assert "workspace_subscriptions" in inspector.get_table_names()
        columns = {
            column["name"]
            for column in inspector.get_columns("workspace_subscriptions")
        }
        assert {
            "id",
            "workspace_id",
            "plan_code",
            "status",
            "source",
            "current_period_start",
            "current_period_end",
            "cancel_at_period_end",
            "cancel_at",
            "created_at",
            "updated_at",
        } <= columns
        unique_constraints = {
            constraint["name"]
            for constraint in inspector.get_unique_constraints(
                "workspace_subscriptions"
            )
        }
        assert "uq_workspace_subscriptions_workspace_id" in unique_constraints
        with migration_engine.begin() as connection:
            rows = (
                connection.execute(
                    text(
                        """
                    SELECT workspace_id, plan_code, status, source
                    FROM workspace_subscriptions
                    """
                    )
                )
                .mappings()
                .all()
            )
            assert rows == [
                {
                    "workspace_id": active_workspace_id,
                    "plan_code": "free",
                    "status": "active",
                    "source": "internal",
                }
            ]

        run_alembic(migration_url, "downgrade", PRE_SUBSCRIPTION_REVISION)
        assert (
            "workspace_subscriptions" not in inspect(migration_engine).get_table_names()
        )
    finally:
        migration_engine.dispose()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(
                f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)'
            )
        admin_engine.dispose()
