from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AnyHttpUrl, Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables and a local .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_prefix="TASKMINER_",
        case_sensitive=False,
        extra="ignore",
    )

    project_name: str = "TaskMiner"
    version: str = "0.1.0"
    debug: bool = False
    log_level: str = "INFO"
    database_url: str = Field(
        description="SQLAlchemy-compatible PostgreSQL connection URL.",
        validation_alias="DATABASE_URL",
    )
    migration_database_url: str | None = Field(
        default=None,
        description="Optional direct PostgreSQL URL used only by Alembic.",
        validation_alias="MIGRATION_DATABASE_URL",
    )
    secret_key: str = Field(
        min_length=32,
        validation_alias="SECRET_KEY",
    )
    access_token_expire_minutes: int = Field(
        gt=0,
        validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES",
    )
    algorithm: Literal["HS256"] = Field(
        validation_alias="ALGORITHM",
    )
    storage_path: Path = Field(
        default=Path("storage"),
        validation_alias="STORAGE_PATH",
    )
    cors_origins: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        validation_alias="CORS_ORIGINS",
    )
    cors_origin_regex: str | None = Field(
        default=None,
        validation_alias="CORS_ORIGIN_REGEX",
    )
    ai_provider: Literal["mock", "openai"] = Field(
        default="mock",
        validation_alias="TASKMINER_AI_PROVIDER",
    )
    openai_api_key: SecretStr | None = Field(
        default=None,
        validation_alias="OPENAI_API_KEY",
    )
    openai_model: str = Field(
        default="gpt-5.6-luna",
        min_length=1,
        validation_alias="TASKMINER_OPENAI_MODEL",
    )
    ai_monthly_request_limit: int | None = Field(
        default=None,
        gt=0,
        validation_alias="TASKMINER_AI_MONTHLY_REQUEST_LIMIT",
        description=(
            "Optional emergency ceiling applied on top of plan-derived AI quotas."
        ),
    )
    ai_rate_limit_requests: int = Field(
        default=10,
        gt=0,
        validation_alias="TASKMINER_AI_RATE_LIMIT_REQUESTS",
    )
    ai_rate_limit_window_seconds: int = Field(
        default=60,
        gt=0,
        validation_alias="TASKMINER_AI_RATE_LIMIT_WINDOW_SECONDS",
    )
    auth_login_rate_limit_requests: int = Field(
        default=10,
        gt=0,
        validation_alias="TASKMINER_AUTH_LOGIN_RATE_LIMIT_REQUESTS",
    )
    auth_login_rate_limit_window_seconds: int = Field(
        default=300,
        gt=0,
        validation_alias="TASKMINER_AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS",
    )
    auth_register_rate_limit_requests: int = Field(
        default=5,
        gt=0,
        validation_alias="TASKMINER_AUTH_REGISTER_RATE_LIMIT_REQUESTS",
    )
    auth_register_rate_limit_window_seconds: int = Field(
        default=3600,
        gt=0,
        validation_alias="TASKMINER_AUTH_REGISTER_RATE_LIMIT_WINDOW_SECONDS",
    )
    trusted_proxy_hops: int = Field(
        default=0,
        ge=0,
        validation_alias="TASKMINER_TRUSTED_PROXY_HOPS",
    )
    attachment_workspace_quota_bytes: int = Field(
        default=1024 * 1024 * 1024,
        gt=0,
        validation_alias="TASKMINER_ATTACHMENT_WORKSPACE_QUOTA_BYTES",
    )
    attachment_upload_rate_limit_requests: int = Field(
        default=20,
        gt=0,
        validation_alias="TASKMINER_ATTACHMENT_UPLOAD_RATE_LIMIT_REQUESTS",
    )
    attachment_upload_rate_limit_window_seconds: int = Field(
        default=60,
        gt=0,
        validation_alias="TASKMINER_ATTACHMENT_UPLOAD_RATE_LIMIT_WINDOW_SECONDS",
    )
    email_provider: Literal["noop", "resend"] = Field(
        default="noop",
        validation_alias="TASKMINER_EMAIL_PROVIDER",
    )
    resend_api_key: SecretStr | None = Field(
        default=None,
        validation_alias="RESEND_API_KEY",
    )
    email_from: str | None = Field(
        default=None,
        validation_alias="TASKMINER_EMAIL_FROM",
    )
    frontend_url: AnyHttpUrl = Field(
        default=AnyHttpUrl("http://localhost:3000"),
        validation_alias="TASKMINER_FRONTEND_URL",
    )
    stripe_secret_key: SecretStr | None = Field(
        default=None,
        validation_alias="STRIPE_SECRET_KEY",
    )
    stripe_webhook_secret: SecretStr | None = Field(
        default=None,
        validation_alias="STRIPE_WEBHOOK_SECRET",
    )
    stripe_pro_price_id: str | None = Field(
        default=None,
        validation_alias="STRIPE_PRO_PRICE_ID",
    )
    billing_success_url: AnyHttpUrl = Field(
        default=AnyHttpUrl("http://localhost:3000/app/workspaces?billing=success"),
        validation_alias="TASKMINER_BILLING_SUCCESS_URL",
    )
    billing_cancel_url: AnyHttpUrl = Field(
        default=AnyHttpUrl("http://localhost:3000/app/workspaces?billing=cancelled"),
        validation_alias="TASKMINER_BILLING_CANCEL_URL",
    )

    @field_validator("database_url", "migration_database_url", mode="before")
    @classmethod
    def use_psycopg_driver(cls, value: str | None) -> str | None:
        """Make provider-issued PostgreSQL URLs use the installed Psycopg 3 driver."""

        if value is None:
            return None
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg://", 1)
        return value

    @field_validator("frontend_url")
    @classmethod
    def validate_frontend_base_url(cls, value: AnyHttpUrl) -> AnyHttpUrl:
        if value.query is not None or value.fragment is not None:
            raise ValueError(
                "TASKMINER_FRONTEND_URL must not contain a query or fragment."
            )
        if value.path not in (None, "/"):
            raise ValueError("TASKMINER_FRONTEND_URL must be an origin without a path.")
        return value

    @model_validator(mode="after")
    def validate_email_provider_configuration(self) -> "Settings":
        if self.email_provider != "resend":
            return self
        if (
            self.resend_api_key is None
            or not self.resend_api_key.get_secret_value().strip()
        ):
            raise ValueError(
                "RESEND_API_KEY is required when TASKMINER_EMAIL_PROVIDER=resend."
            )
        if self.email_from is None or not self.email_from.strip():
            raise ValueError(
                "TASKMINER_EMAIL_FROM is required when TASKMINER_EMAIL_PROVIDER=resend."
            )
        if "\n" in self.email_from or "\r" in self.email_from:
            raise ValueError("TASKMINER_EMAIL_FROM must not contain line breaks.")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        """Return normalized origins configured as a comma-separated value."""

        return [
            origin.strip().rstrip("/")
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]

    @property
    def billing_enabled(self) -> bool:
        """Return whether every server-side Stripe credential is configured."""

        return all(
            (
                self.stripe_secret_key is not None
                and bool(self.stripe_secret_key.get_secret_value().strip()),
                self.stripe_webhook_secret is not None
                and bool(self.stripe_webhook_secret.get_secret_value().strip()),
                self.stripe_pro_price_id is not None
                and bool(self.stripe_pro_price_id.strip()),
            )
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
