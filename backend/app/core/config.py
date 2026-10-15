from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    app_name: str = "CulturalGuard AI"
    api_v1_prefix: str = "/api/v1"

    database_url: str = "sqlite:///./culturalguard.db"
    jwt_secret: str = "dev-only-change-me"
    jwt_access_minutes: int = 30
    jwt_refresh_days: int = 14
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    frontend_url: str = "http://localhost:5173"
    upload_dir: str = "./uploads"
    max_upload_mb: int = 10
    rate_limit_per_minute: int = 120

    # Google Gemini Developer API. Gemini 3.5 Flash-Lite currently has an
    # eligible free tier and accepts image + text inputs. Only the API key is
    # normally required for local development; endpoint/model have safe defaults.
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-3.5-flash-lite"
    gemini_endpoint: str = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    gemini_timeout_seconds: int = 120
    gemini_json_mode: bool = True

    model_config = SettingsConfigDict(env_file="../.env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_list(self) -> list[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]

    @property
    def live_ai_configured(self) -> bool:
        return bool(
            (self.gemini_api_key or "").strip()
            and self.gemini_endpoint.strip()
            and self.gemini_model.strip()
        )

    @property
    def evaluation_model_name(self) -> str:
        return self.gemini_model.strip()

    @property
    def evaluation_provider_name(self) -> str:
        return "Google Gemini (Free Tier)"

    def ensure_dirs(self) -> None:
        Path(self.upload_dir).mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.ensure_dirs()
    return settings
