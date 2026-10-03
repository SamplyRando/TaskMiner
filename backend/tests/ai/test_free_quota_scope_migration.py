import os
from pathlib import Path
import subprocess
import sys
from uuid import uuid4

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url


BACKEND_DIRECTORY = Path(__file__).resolve().parents[2]
PRE_FREE_QUOTA_SCOPE_REVISION = "f2a8c4d6e1b3"


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


def test_free_quota_scope_migration_backfills_and_downgrades() -> None:
    base_url = make_url(os.environ["TEST_DATABASE_URL"])
    database_name = f"taskminer_free_quota_migration_test_{uuid4().hex}"
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
        run_alembic(migration_url, "upgrade", PRE_FREE_QUOTA_SCOPE_REVISION)
        free_owner_id = uuid4()
        pro_owner_id = uuid4()
        free_workspace_id = uuid4()
        pro_workspace_id = uuid4()
        with migration_engine.begin() as connection:
            connection.execute(
                text(
                    """
                    INSERT INTO users (
                        id, email, hashed_password, full_name, is_active
                    ) VALUES
                        (:free_owner_id, :free_email, 'hash', 'Free Owner', true),
                        (:pro_owner_id, :pro_email, 'hash', 'Pro Owner', true)
                    """
                ),
                {
                    "free_owner_id": free_owner_id,
                    "free_email": f"{free_owner_id}@example.com",
                    "pro_owner_id": pro_owner_id,
                    "pro_email": f"{pro_owner_id}@example.com",
                },
            )
            connection.execute(
                text(
                    """
                    INSERT INTO workspaces (id, name, owner_id) VALUES
                        (:free_workspace_id, 'Free', :free_owner_id),
                        (:pro_workspace_id, 'Pro', :pro_owner_id)
                    """
                ),
                {
                    "free_workspace_id": free_workspace_id,
                    "free_owner_id": free_owner_id,
                    "pro_workspace_id": pro_workspace_id,
                    "pro_owner_id": pro_owner_id,
                },
            )
            connection.execute(
                text(
                    """
                    INSERT INTO workspace_subscriptions (
                        workspace_id, plan_code, status, source
                    ) VALUES
                        (:free_workspace_id, 'free', 'active', 'internal'),
                        (:pro_workspace_id, 'pro', 'active', 'stripe')
                    """
                ),
                {
                    "free_workspace_id": free_workspace_id,
                    "pro_workspace_id": pro_workspace_id,
                },
            )
            connection.execute(
                text(
                    """
                    INSERT INTO ai_usage_events (
                        workspace_id, user_id, operation_type, provider, model, status
                    ) VALUES
                        (:free_workspace_id, :free_owner_id,
                         'project_plan', 'openai', 'model', 'success'),
                        (:pro_workspace_id, :pro_owner_id,
                         'project_plan', 'openai', 'model', 'success')
                    """
                ),
                {
                    "free_workspace_id": free_workspace_id,
                    "free_owner_id": free_owner_id,
                    "pro_workspace_id": pro_workspace_id,
                    "pro_owner_id": pro_owner_id,
                },
            )

        run_alembic(migration_url, "upgrade", "head")

        inspector = inspect(migration_engine)
        columns = {
            column["name"] for column in inspector.get_columns("ai_usage_events")
        }
        indexes = {index["name"] for index in inspector.get_indexes("ai_usage_events")}
        assert "free_quota_owner_id" in columns
        assert "ix_ai_usage_events_free_owner_created" in indexes
        with migration_engine.connect() as connection:
            rows = connection.execute(
                text(
                    """
                    SELECT workspace_id, free_quota_owner_id
                    FROM ai_usage_events
                    ORDER BY workspace_id
                    """
                )
            ).mappings()
            scopes = {row["workspace_id"]: row["free_quota_owner_id"] for row in rows}
        assert scopes[free_workspace_id] == free_owner_id
        assert scopes[pro_workspace_id] is None

        run_alembic(
            migration_url,
            "downgrade",
            PRE_FREE_QUOTA_SCOPE_REVISION,
        )
        columns_after_downgrade = {
            column["name"]
            for column in inspect(migration_engine).get_columns("ai_usage_events")
        }
        assert "free_quota_owner_id" not in columns_after_downgrade
    finally:
        migration_engine.dispose()
        with admin_engine.connect() as connection:
            connection.exec_driver_sql(
                f'DROP DATABASE IF EXISTS "{database_name}" WITH (FORCE)'
            )
        admin_engine.dispose()
