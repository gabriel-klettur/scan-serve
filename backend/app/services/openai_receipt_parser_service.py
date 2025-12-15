from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

from openai import OpenAI

from app.models.ai_receipt import AiReceiptParseResponse
from app.models.ocr import BoundingBox, OCRFields
from app.services.ai_receipt_agents.openai_text_client import OpenAiTextClient
from app.services.ai_receipt_agents.pipeline import ReceiptAiModels, ReceiptAiPipeline
from app.services.ai_receipt_agents.types import ReceiptAiInput


@dataclass(frozen=True)
class OpenAiReceiptParserConfig:
    api_key: str
    model: str = "gpt-5-mini"
    organizer_model: Optional[str] = None
    auditor_model: Optional[str] = None
    stylist_model: Optional[str] = None
    json_retries: int = 1


class OpenAiReceiptParserService:
    def __init__(self, config: OpenAiReceiptParserConfig) -> None:
        self._config = config
        self._client = OpenAI(api_key=config.api_key) if config.api_key else None

        if self._client:
            models = ReceiptAiModels(
                organizer=config.organizer_model or config.model,
                auditor=config.auditor_model or config.model,
                stylist=config.stylist_model or config.model,
            )
            self._pipeline = ReceiptAiPipeline(
                llm=OpenAiTextClient(self._client),
                models=models,
                logger=logging.getLogger("app"),
                max_json_retries=config.json_retries,
            )
        else:
            self._pipeline = None

    @staticmethod
    def _safe_text(s: Optional[str]) -> str:
        return (s or "").strip()

    def parse(
        self,
        text_raw: str,
        fields_hint: Optional[OCRFields] = None,
        boxes: Optional[list[BoundingBox]] = None,
    ) -> AiReceiptParseResponse:
        if not self._pipeline:
            raise RuntimeError("OpenAI API key is not configured")

        return self._pipeline.parse(
            ReceiptAiInput(
                text_raw=text_raw,
                fields_hint=fields_hint,
                boxes=boxes,
            )
        )

    def parse_stream(
        self,
        text_raw: str,
        fields_hint: Optional[OCRFields] = None,
        boxes: Optional[list[BoundingBox]] = None,
    ):
        if not self._pipeline:
            raise RuntimeError("OpenAI API key is not configured")

        return self._pipeline.parse_stream(
            ReceiptAiInput(
                text_raw=text_raw,
                fields_hint=fields_hint,
                boxes=boxes,
            )
        )
