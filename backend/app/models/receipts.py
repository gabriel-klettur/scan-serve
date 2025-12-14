from __future__ import annotations

from typing import Optional

from pydantic import BaseModel

from app.models.ocr import OCRResponse


class Receipt(BaseModel):
    id: str
    folderId: Optional[str]
    createdAt: int
    updatedAt: int
    originalFileName: str
    mimeType: str
    image_url: str
    ocr: Optional[OCRResponse] = None
