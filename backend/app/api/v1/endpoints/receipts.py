from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile

from app.core.deps import get_receipts_service, get_storage_service
from app.models.receipts import Receipt

router = APIRouter()


@router.get("", response_model=list[Receipt])
def list_receipts(
    folderId: Optional[str] = Query(default=None),
    service=Depends(get_receipts_service),
) -> list[Receipt]:
    return service.list_receipts(folderId)


@router.post("", response_model=Receipt)
async def create_receipt(
    file: UploadFile = File(...),
    folderId: Optional[str] = Form(default=None),
    runOcr: bool = Form(default=True),
    ocrEngine: str = Form(default="easyocr", pattern="^(easyocr|vision|both)$"),
    storage=Depends(get_storage_service),
    service=Depends(get_receipts_service),
) -> Receipt:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported")

    image_path, rel_url = storage.save_upload(file, subdir="receipts")

    try:
        return service.add_receipt(
            folder_id=folderId,
            original_file_name=file.filename or "receipt",
            mime_type=file.content_type or "application/octet-stream",
            image_url=rel_url,
            ocr_image_path=str(image_path),
            run_ocr=runOcr,
            ocr_engine=ocrEngine,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.patch("/{receipt_id}/folder", response_model=Receipt)
def update_receipt_folder(
    receipt_id: str,
    folderId: Optional[str] = Form(default=None),
    service=Depends(get_receipts_service),
) -> Receipt:
    try:
        return service.update_receipt_folder(receipt_id, folderId)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.delete("/{receipt_id}")
def delete_receipt(receipt_id: str, service=Depends(get_receipts_service)) -> dict[str, str]:
    service.delete_receipt(receipt_id)
    return {"status": "ok"}
