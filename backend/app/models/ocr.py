from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class BoundingBox(BaseModel):
    text: str
    bbox: list[list[float]]
    confidence: float


class OCRFields(BaseModel):
    total: Optional[float] = None
    date: Optional[str] = None
    merchant: Optional[str] = None


class OCRResponse(BaseModel):
    original_image_url: str
    processed_image_url: str
    text_raw: str
    confidence_avg: float
    fields: OCRFields
    boxes: list[BoundingBox]
