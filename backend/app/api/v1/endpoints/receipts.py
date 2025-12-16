from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile

from pydantic import BaseModel

from app.core.deps import get_ocr_queue, get_receipts_service, get_storage_service
from app.core.deps import get_ai_trace_service
from app.models.ai_trace import AiReceiptRevision, AiReceiptRun
from app.models.receipts import Receipt

router = APIRouter()


class ReceiptOcrStatus(BaseModel):
    receiptId: str
    status: str
    queuePosition: Optional[int] = None
    error: Optional[str] = None


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
    ocr_queue=Depends(get_ocr_queue),
) -> Receipt:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported")

    image_path, rel_url = storage.save_upload(file, subdir="receipts")

    try:
        receipt = service.add_receipt(
            folder_id=folderId,
            original_file_name=file.filename or "receipt",
            mime_type=file.content_type or "application/octet-stream",
            image_url=rel_url,
            ocr_image_path=str(image_path),
            run_ocr=False,
            ocr_engine=ocrEngine,
        )

        if runOcr:
            job_id = ocr_queue.enqueue(
                receipt_id=receipt.id,
                image_url=rel_url,
                image_path=str(image_path),
                engine=ocrEngine,
            )
            snap = ocr_queue.snapshot_for_job(job_id)
            receipt = service.update_receipt_ocr_meta(
                receipt.id,
                ocr_status=snap.status,
                ocr_job_id=job_id,
                ocr_error=None,
                queue_position=snap.queue_position,
            )

        return receipt
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/{receipt_id}", response_model=Receipt)
def get_receipt(
    receipt_id: str,
    service=Depends(get_receipts_service),
    ocr_queue=Depends(get_ocr_queue),
) -> Receipt:
    try:
        receipt = service.get_receipt(receipt_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    snap = ocr_queue.snapshot_for_receipt(receipt_id)
    # If the receipt isn't finished yet, prefer the queue snapshot for live status/position.
    if receipt.ocr is None and snap.status != "unknown":
        receipt.ocrStatus = snap.status
        receipt.queuePosition = snap.queue_position
    return receipt


@router.get("/{receipt_id}/ai/runs", response_model=list[AiReceiptRun])
def list_ai_runs(
    receipt_id: str,
    trace=Depends(get_ai_trace_service),
) -> list[AiReceiptRun]:
    return trace.list_runs(receipt_id=receipt_id)


@router.get("/{receipt_id}/ai/runs/{run_id}/revisions", response_model=list[AiReceiptRevision])
def list_ai_revisions(
    receipt_id: str,
    run_id: str,
    trace=Depends(get_ai_trace_service),
) -> list[AiReceiptRevision]:
    return trace.list_revisions(receipt_id=receipt_id, run_id=run_id)


@router.get("/{receipt_id}/ai/revisions/{revision_id}", response_model=AiReceiptRevision)
def get_ai_revision(
    receipt_id: str,
    revision_id: str,
    trace=Depends(get_ai_trace_service),
) -> AiReceiptRevision:
    try:
        return trace.get_revision(receipt_id=receipt_id, revision_id=revision_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/{receipt_id}/ocr-status", response_model=ReceiptOcrStatus)
def get_receipt_ocr_status(
    receipt_id: str,
    service=Depends(get_receipts_service),
    ocr_queue=Depends(get_ocr_queue),
) -> ReceiptOcrStatus:
    try:
        receipt = service.get_receipt(receipt_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e

    snap = ocr_queue.snapshot_for_receipt(receipt_id)
    status = receipt.ocrStatus or snap.status
    queue_pos = snap.queue_position

    if status in {"queued", "processing"}:
        # Best-effort persistence so list_receipts can show position without extra calls.
        try:
            service.update_receipt_ocr_meta(receipt_id, ocr_status=status, queue_position=queue_pos)
        except KeyError:
            pass

    return ReceiptOcrStatus(
        receiptId=receipt_id,
        status=status or "unknown",
        queuePosition=queue_pos,
        error=receipt.ocrError,
    )


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
