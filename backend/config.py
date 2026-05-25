from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str

    r2_account_id: str
    r2_access_key_id: str
    r2_secret_access_key: str
    r2_bucket_name: str
    r2_public_domain: str

    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]
    frontend_url: str = "http://localhost:5173"
    environment: str = "development"

    jwt_secret: str
    jwt_access_expire_minutes: int = 15
    jwt_refresh_expire_days: int = 30
    cookie_secure: bool = False
    cookie_domain: str = "localhost"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]
        return [origin.rstrip("/") for origin in value]

    @field_validator("r2_public_domain")
    @classmethod
    def normalize_r2_public_domain(cls, value: str) -> str:
        normalized = value.removeprefix("https://").removeprefix("http://").rstrip("/")
        if normalized.endswith(".r2.cloudflarestorage.com"):
            raise ValueError(
                "R2_PUBLIC_DOMAIN must be the public r2.dev/custom domain, "
                "not the private r2.cloudflarestorage.com S3 API endpoint"
            )
        return normalized

    @field_validator("frontend_url")
    @classmethod
    def normalize_frontend_url(cls, value: str) -> str:
        return value.rstrip("/")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
