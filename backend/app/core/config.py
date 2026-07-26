from functools import lru_cache
from typing import Literal

from pydantic import Field
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
    secret_key: str | None = Field(
        default=None,
        min_length=32,
        validation_alias="SECRET_KEY",
    )
    access_token_expire_minutes: int | None = Field(
        default=None,
        gt=0,
        validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES",
    )
    algorithm: Literal["HS256"] | None = Field(
        default=None,
        validation_alias="ALGORITHM",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
