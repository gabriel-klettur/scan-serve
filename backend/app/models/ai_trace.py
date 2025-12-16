from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel

from app.models.ocr import OCRFields


class AiReceiptRevision(BaseModel):
    id: str
    runId: str
    receiptId: str
    stage: str
    createdAt: int
    agentLabel: Optional[str] = None
    model: Optional[str] = None
    fields: OCRFields
    text_clean: str
    markdown: str
    markdownPath: Optional[str] = None
    data: dict[str, Any]


class AiReceiptRun(BaseModel):
    id: str
    receiptId: str
    createdAt: int
    updatedAt: int
    status: str
    agents: dict[str, str] = {}
    error: Optional[str] = None
    elapsedMs: Optional[int] = None

