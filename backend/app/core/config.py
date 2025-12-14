from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    api_v1_prefix: str = "/api/v1"
    cors_origins: list[str] = [
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ]

    project_name: str = "RecipeVision"

    backend_root: Path = Path(__file__).resolve().parents[2]
    data_file: Path = backend_root / "data" / "db.json"
    uploads_dir: Path = backend_root / "uploads"
    logs_dir: Path = backend_root / "logs"

    log_level: str = "INFO"
    log_json: bool = False
    log_color: bool = True

    model_config = SettingsConfigDict(
        env_prefix="RV_",
        case_sensitive=False,
        env_file=(Path(__file__).resolve().parents[2] / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
