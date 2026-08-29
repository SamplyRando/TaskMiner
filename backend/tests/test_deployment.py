from typing import Any

from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest

from app.core.config import Settings


def validate_deployment_settings(values: dict[str, Any]) -> Settings:
    return Settings(_env_file=None, **values)  # type: ignore[call-arg]


def build_settings(**overrides: object) -> Settings:
    values: dict[str, Any] = {
        "DATABASE_URL": "postgresql://user:password@host/database",
        "SECRET_KEY": "deployment-test-secret-key-at-least-32-characters",
        "ACCESS_TOKEN_EXPIRE_MINUTES": 30,
        "ALGORITHM": "HS256",
    }
    values.update(overrides)
    return validate_deployment_settings(values)


def test_complete_security_settings_are_valid() -> None:
    deployment_settings = build_settings()

    assert deployment_settings.secret_key == (
        "deployment-test-secret-key-at-least-32-characters"
    )
    assert deployment_settings.access_token_expire_minutes == 30
    assert deployment_settings.algorithm == "HS256"


@pytest.mark.parametrize(
    "missing_setting",
    ["SECRET_KEY", "ACCESS_TOKEN_EXPIRE_MINUTES", "ALGORITHM"],
)
def test_security_settings_are_required(
    missing_setting: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    values: dict[str, Any] = {
        "DATABASE_URL": "postgresql://user:password@host/database",
        "SECRET_KEY": "deployment-test-secret-key-at-least-32-characters",
        "ACCESS_TOKEN_EXPIRE_MINUTES": 30,
        "ALGORITHM": "HS256",
    }
    values.pop(missing_setting)
    monkeypatch.delenv(missing_setting, raising=False)

    with pytest.raises(ValidationError):
        validate_deployment_settings(values)


def test_provider_database_urls_use_psycopg_3() -> None:
    deployment_settings = build_settings(
        DATABASE_URL="postgresql://user:password@pooler/database?sslmode=require",
        MIGRATION_DATABASE_URL="postgres://user:password@direct/database",
    )

    assert deployment_settings.database_url.startswith("postgresql+psycopg://")
    assert deployment_settings.migration_database_url is not None
    assert deployment_settings.migration_database_url.startswith(
        "postgresql+psycopg://"
    )


def test_explicit_sqlalchemy_database_url_is_preserved() -> None:
    database_url = "postgresql+psycopg://user:password@host/database"

    deployment_settings = build_settings(DATABASE_URL=database_url)

    assert deployment_settings.database_url == database_url


def test_ai_control_defaults_are_safe_and_positive() -> None:
    deployment_settings = build_settings()

    assert deployment_settings.ai_monthly_request_limit == 100
    assert deployment_settings.ai_rate_limit_requests == 10
    assert deployment_settings.ai_rate_limit_window_seconds == 60


def test_ai_controls_are_configurable() -> None:
    deployment_settings = build_settings(
        TASKMINER_AI_MONTHLY_REQUEST_LIMIT=250,
        TASKMINER_AI_RATE_LIMIT_REQUESTS=5,
        TASKMINER_AI_RATE_LIMIT_WINDOW_SECONDS=30,
    )

    assert deployment_settings.ai_monthly_request_limit == 250
    assert deployment_settings.ai_rate_limit_requests == 5
    assert deployment_settings.ai_rate_limit_window_seconds == 30


@pytest.mark.parametrize(
    "setting",
    [
        "TASKMINER_AI_MONTHLY_REQUEST_LIMIT",
        "TASKMINER_AI_RATE_LIMIT_REQUESTS",
        "TASKMINER_AI_RATE_LIMIT_WINDOW_SECONDS",
    ],
)
def test_ai_control_limits_reject_non_positive_values(setting: str) -> None:
    with pytest.raises(ValidationError):
        build_settings(**{setting: 0})


def test_cors_origins_are_normalized() -> None:
    deployment_settings = build_settings(
        CORS_ORIGINS=" https://taskminer.vercel.app/, http://localhost:3000 "
    )

    assert deployment_settings.cors_origin_list == [
        "https://taskminer.vercel.app",
        "http://localhost:3000",
    ]


def test_cors_preview_regex_is_loaded_from_deployment_configuration() -> None:
    regex = r"^https://task-miner(?:-[a-z0-9-]+)*\.vercel\.app$"

    deployment_settings = build_settings(CORS_ORIGIN_REGEX=regex)

    assert deployment_settings.cors_origin_regex == regex


def test_cors_preflight_allows_configured_frontend(client: TestClient) -> None:
    response = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ("http://localhost:3000")


def test_unimplemented_user_collection_is_not_exposed(client: TestClient) -> None:
    response = client.get("/api/v1/users")

    assert response.status_code == 404
