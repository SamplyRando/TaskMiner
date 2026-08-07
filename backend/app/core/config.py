from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
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

    @property
    def cors_origin_list(self) -> list[str]:
        """Return normalized origins configured as a comma-separated value."""

        return [
            origin.strip().rstrip("/")
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
