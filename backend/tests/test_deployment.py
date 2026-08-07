from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest

from app.core.config import Settings


def build_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "DATABASE_URL": "postgresql://user:password@host/database",
        "SECRET_KEY": "deployment-test-secret-key-at-least-32-characters",
        "ACCESS_TOKEN_EXPIRE_MINUTES": 30,
        "ALGORITHM": "HS256",
    }
    values.update(overrides)
    return Settings.model_validate(values)


@pytest.mark.parametrize(
    "missing_setting",
    ["SECRET_KEY", "ACCESS_TOKEN_EXPIRE_MINUTES", "ALGORITHM"],
)
def test_security_settings_are_required(
    missing_setting: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    values: dict[str, object] = {
        "DATABASE_URL": "postgresql://user:password@host/database",
        "SECRET_KEY": "deployment-test-secret-key-at-least-32-characters",
        "ACCESS_TOKEN_EXPIRE_MINUTES": 30,
        "ALGORITHM": "HS256",
    }
    values.pop(missing_setting)
    monkeypatch.delenv(missing_setting, raising=False)

    with pytest.raises(ValidationError):
        Settings.model_validate(values)


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


def test_cors_origins_are_normalized() -> None:
    deployment_settings = build_settings(
        CORS_ORIGINS=" https://taskminer.vercel.app/, http://localhost:3000 "
    )

    assert deployment_settings.cors_origin_list == [
        "https://taskminer.vercel.app",
        "http://localhost:3000",
    ]


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
