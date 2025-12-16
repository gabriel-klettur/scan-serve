from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel

from app.models.ocr import BoundingBox, OCRFields


class AiReceiptParseRequest(BaseModel):
    receiptId: Optional[str] = None
    text_raw: str
    fields: Optional[OCRFields] = None
    boxes: Optional[list[BoundingBox]] = None


class AiReceiptParseResponse(BaseModel):
    fields: OCRFields
    text_clean: str
    markdown: str
    data: dict[str, Any]
