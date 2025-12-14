from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile

from app.core.deps import get_ocr_service, get_storage_service
from app.models.ocr import BoundingBox, OCRFields, OCRResponse

router = APIRouter()


@router.post("/ocr", response_model=OCRResponse)
async def ocr_endpoint(
    request: Request,
    file: UploadFile = File(...),
    storage=Depends(get_storage_service),
    ocr_service=Depends(get_ocr_service),
) -> OCRResponse:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported")

    image_path, rel_url = storage.save_upload(file, subdir="ocr")
    base = str(request.base_url).rstrip("/")
    image_url = f"{base}{rel_url}"

    try:
        lines = ocr_service.read(str(image_path))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    text_lines = [l.text for l in lines]
    text_raw = "\n".join(text_lines)
    conf_avg = (sum(l.confidence for l in lines) / len(lines)) if lines else 0.0

    fields = OCRFields(
        merchant=ocr_service.guess_merchant(text_lines),
        date=ocr_service.guess_date(text_raw),
        total=ocr_service.guess_total(text_raw),
    )

    boxes = [BoundingBox(text=l.text, bbox=l.bbox, confidence=l.confidence) for l in lines]

    return OCRResponse(
        original_image_url=image_url,
        processed_image_url=image_url,
        text_raw=text_raw,
        confidence_avg=float(conf_avg),
        fields=fields,
        boxes=boxes,
    )
