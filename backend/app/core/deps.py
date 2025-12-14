from __future__ import annotations

from functools import lru_cache

from app.core.config import settings
from app.repositories.json_db import JsonDb
from app.services.ocr_service import OcrService
from app.services.receipts_service import ReceiptsService
from app.services.storage_service import StorageService


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
def _receipts_service() -> ReceiptsService:
    return ReceiptsService(db=_db(), ocr_service=_ocr())


def get_storage_service() -> StorageService:
    return _storage()


def get_ocr_service() -> OcrService:
    return _ocr()


def get_receipts_service() -> ReceiptsService:
    return _receipts_service()
