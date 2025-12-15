from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.endpoints.ocr import router as ocr_router
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import init_logging
from app.core.logger import get_logger
from app.core.middleware import add_request_logging

app = FastAPI(title=settings.project_name)

init_logging(
    level=settings.log_level,
    logs_dir=settings.logs_dir,
    json_logs=settings.log_json,
    color=settings.log_color,
)
app.state.logger = get_logger("app")
app.state.logger.info("config openai_receipt_model=%s", settings.openai_receipt_model)
app.state.logger.info("config openai_api_key_configured=%s", bool(settings.gpt_5_mini_api_key))

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

settings.uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(settings.uploads_dir)), name="uploads")

add_request_logging(app)

# Frontend compatibility: the React app posts to /ocr (no version prefix).
app.include_router(ocr_router)
app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, str]:
    return {"name": settings.project_name}
