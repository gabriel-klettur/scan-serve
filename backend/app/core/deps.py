from __future__ import annotations

from functools import lru_cache

from app.core.config import settings
from app.repositories.json_db import JsonDb
from app.services.google_vision_ocr_service import GoogleVisionOcrConfig, GoogleVisionOcrService
from app.services.openai_receipt_parser_service import OpenAiReceiptParserConfig, OpenAiReceiptParserService
from app.services.ocr_service import OcrService
from app.services.receipts_service import ReceiptsService
from app.services.storage_service import StorageService
from app.services.ticket_html_renderer import TicketHtmlRenderer


@lru_cache
def _db() -> JsonDb:
    return JsonDb(settings.data_file)


@lru_cache
def _storage() -> StorageService:
    return StorageService(settings.uploads_dir)


@lru_cache
def _ocr() -> OcrService:
    return OcrService(languages=["is", "en"])


@lru_cache
def _google_vision_ocr() -> GoogleVisionOcrService:
    return GoogleVisionOcrService(
        GoogleVisionOcrConfig(
            api_key=settings.google_vision_api_key,
            language_hints=settings.google_vision_language_hints,
        )
    )


@lru_cache
def _ticket_html_renderer() -> TicketHtmlRenderer:
    return TicketHtmlRenderer()


@lru_cache
def _openai_receipt_parser() -> OpenAiReceiptParserService:
    return OpenAiReceiptParserService(
        OpenAiReceiptParserConfig(
            api_key=settings.gpt_5_mini_api_key,
            model="gpt-5-mini",
        )
    )


@lru_cache
def _receipts_service() -> ReceiptsService:
    return ReceiptsService(db=_db(), ocr_service=_ocr(), vision_ocr_service=_google_vision_ocr())


def get_storage_service() -> StorageService:
    return _storage()


def get_ocr_service() -> OcrService:
    return _ocr()


def get_google_vision_ocr_service() -> GoogleVisionOcrService:
    return _google_vision_ocr()


def get_ticket_html_renderer() -> TicketHtmlRenderer:
    return _ticket_html_renderer()


def get_openai_receipt_parser_service() -> OpenAiReceiptParserService:
    return _openai_receipt_parser()


def get_receipts_service() -> ReceiptsService:
    return _receipts_service()
