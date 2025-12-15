from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional

from app.models.ocr import BoundingBox, OCRFields


@dataclass(frozen=True)
class ReceiptAiInput:
    text_raw: str
    fields_hint: Optional[OCRFields]
    boxes: Optional[list[BoundingBox]]


@dataclass(frozen=True)
class ReceiptAiStepOutput:
    fields: dict[str, Any]
    text_clean: str
    markdown: str
    data: dict[str, Any]
