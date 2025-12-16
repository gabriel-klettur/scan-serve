from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints.folders import router as folders_router
from app.api.v1.endpoints.notifications import router as notifications_router
from app.api.v1.endpoints.ocr import router as ocr_router
from app.api.v1.endpoints.receipts import router as receipts_router

api_router = APIRouter()

api_router.include_router(ocr_router, tags=["ocr"])
api_router.include_router(folders_router, prefix="/folders", tags=["folders"])
api_router.include_router(receipts_router, prefix="/receipts", tags=["receipts"])
api_router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])
