from __future__ import annotations

from pathlib import Path

from pydantic import AliasChoices, Field
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

    ocr_queue_max_concurrent: int = Field(default=1, validation_alias="OCR_QUEUE_MAX_CONCURRENT")

    google_vision_api_key: str = Field(default="", validation_alias="GOOGLE_VISION_OCR_API_KEY")
    google_vision_language_hints: list[str] = Field(default_factory=lambda: ["is", "en"], validation_alias="VISION_LANGUAGE_HINTS")

    gpt_5_mini_api_key: str = Field(
        default="",
        validation_alias=AliasChoices(
            "RV_GPT_5_MINI_API",
            "GPT_5_MINI_API",
            "GPT_API",
            "OPENAI_API_KEY",
        ),
    )
    openai_receipt_model: str = "gpt-5-mini"
    openai_receipt_organizer_model: str | None = None
    openai_receipt_auditor_model: str | None = None
    openai_receipt_stylist_model: str | None = None
    openai_receipt_json_retries: int = 1

    model_config = SettingsConfigDict(
        env_prefix="RV_",
        case_sensitive=False,
        env_file=(Path(__file__).resolve().parents[2] / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
