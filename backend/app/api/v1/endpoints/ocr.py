from __future__ import annotations
 
import json
import logging
import re
from typing import Iterator
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import HTMLResponse, StreamingResponse
 
from app.core.deps import (
    get_google_vision_ocr_service,
    get_ocr_service,
    get_openai_receipt_parser_service,
    get_storage_service,
    get_ticket_html_renderer,
)
from app.models.ai_receipt import AiReceiptParseRequest, AiReceiptParseResponse
from app.models.ocr import BoundingBox, OCRFields, OCRResponse
from app.services.ocr_service import OcrLine

router = APIRouter()


def _apply_extracted_fields(lines: list[OcrLine], fields: OCRFields) -> list[OcrLine]:
    if not lines:
        return lines

    updated = list(lines)

    if fields.merchant:
        updated[0] = OcrLine(text=fields.merchant, bbox=updated[0].bbox, confidence=updated[0].confidence)

    if fields.date:
        date_pattern = re.compile(r"\b(\d{2}[./-]\d{2}[./-]\d{2,4}|\d{4}[./-]\d{2}[./-]\d{2})\b")
        best_idx = None
        for i, ln in enumerate(updated[:20]):
            if date_pattern.search(ln.text):
                best_idx = i
                break
        if best_idx is not None:
            replaced = date_pattern.sub(fields.date, updated[best_idx].text, count=1)
            updated[best_idx] = OcrLine(text=replaced, bbox=updated[best_idx].bbox, confidence=updated[best_idx].confidence)

    if fields.total is not None:
        total_str = f"{fields.total:.2f}"
        money_pattern = re.compile(r"(\d+[\.,]\d{2})")
        keywords = ("samtals", "heild", "total", "alls")

        best_idx = None
        for i in range(len(updated) - 1, -1, -1):
            txt = updated[i].text.lower()
            if any(k in txt for k in keywords) and money_pattern.search(updated[i].text):
                best_idx = i
                break

        if best_idx is None:
            for i in range(len(updated) - 1, -1, -1):
                if money_pattern.search(updated[i].text):
                    best_idx = i
                    break

        if best_idx is not None:
            replaced = money_pattern.sub(total_str, updated[best_idx].text, count=1)
            updated[best_idx] = OcrLine(text=replaced, bbox=updated[best_idx].bbox, confidence=updated[best_idx].confidence)

    return updated


@router.post("/ocr", response_model=OCRResponse)
async def ocr_endpoint(
    request: Request,
    file: UploadFile = File(...),
    engine: str = Query(default="easyocr", pattern="^(easyocr|vision|both)$"),
    storage=Depends(get_storage_service),
    ocr_service=Depends(get_ocr_service),
    vision_ocr_service=Depends(get_google_vision_ocr_service),
) -> OCRResponse:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported")

    image_path, rel_url = storage.save_upload(file, subdir="ocr")
    base = str(request.base_url).rstrip("/")
    image_url = f"{base}{rel_url}"

    try:
        if engine in {"vision", "both"}:
            if not getattr(vision_ocr_service, "_config", None) or not vision_ocr_service._config.api_key:  # type: ignore[attr-defined]
                raise RuntimeError("Google Vision API key is not configured")
            vision_lines = vision_ocr_service.read(str(image_path))
        else:
            vision_lines = []

        if engine in {"easyocr", "both"}:
            easy_lines = ocr_service.read(str(image_path))
        else:
            easy_lines = []

        lines = vision_lines if vision_lines else easy_lines
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    text_lines = [l.text for l in lines]
    text_raw = "\n".join(text_lines)
    conf_avg = (sum(l.confidence for l in lines) / len(lines)) if lines else 0.0

    if engine == "both" and easy_lines:
        combined_text = "\n".join([l.text for l in (vision_lines + easy_lines)])
    else:
        combined_text = text_raw

    fields = OCRFields(
        merchant=ocr_service.guess_merchant(text_lines),
        date=ocr_service.guess_date(text_raw) or ocr_service.guess_date(combined_text),
        total=ocr_service.guess_total(text_raw) or ocr_service.guess_total(combined_text),
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


@router.post("/ocr/ticket", response_class=HTMLResponse)
async def ocr_ticket_endpoint(
    request: Request,
    file: UploadFile = File(...),
    engine: str = Query(default="easyocr", pattern="^(easyocr|vision|both)$"),
    maxWidthPx: int = Query(default=420, ge=240, le=980),
    backgroundOpacity: float = Query(default=0.18, ge=0.0, le=1.0),
    storage=Depends(get_storage_service),
    ocr_service=Depends(get_ocr_service),
    vision_ocr_service=Depends(get_google_vision_ocr_service),
    ticket_renderer=Depends(get_ticket_html_renderer),
) -> HTMLResponse:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported")

    image_path, rel_url = storage.save_upload(file, subdir="ocr")
    base = str(request.base_url).rstrip("/")
    image_url = f"{base}{rel_url}"

    try:
        if engine in {"vision", "both"}:
            if not getattr(vision_ocr_service, "_config", None) or not vision_ocr_service._config.api_key:  # type: ignore[attr-defined]
                raise RuntimeError("Google Vision API key is not configured")
            vision_lines = vision_ocr_service.read(str(image_path))
        else:
            vision_lines = []

        if engine in {"easyocr", "both"}:
            easy_lines = ocr_service.read(str(image_path))
        else:
            easy_lines = []

        lines = vision_lines if vision_lines else easy_lines
        text_lines = [l.text for l in lines]
        text_raw = "\n".join(text_lines)
        if engine == "both" and easy_lines:
            combined_text = "\n".join([l.text for l in (vision_lines + easy_lines)])
        else:
            combined_text = text_raw

        fields = OCRFields(
            merchant=ocr_service.guess_merchant(text_lines),
            date=ocr_service.guess_date(text_raw) or ocr_service.guess_date(combined_text),
            total=ocr_service.guess_total(text_raw) or ocr_service.guess_total(combined_text),
        )

        patched_lines = _apply_extracted_fields(lines, fields)
        html_doc = ticket_renderer.render(
            image_url=image_url,
            image_path=str(image_path),
            lines=patched_lines,
            max_width_px=maxWidthPx,
            background_opacity=backgroundOpacity,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    return HTMLResponse(content=html_doc)


@router.post("/ocr/ai/parse", response_model=AiReceiptParseResponse)
async def ocr_ai_parse_endpoint(
    payload: AiReceiptParseRequest,
    parser=Depends(get_openai_receipt_parser_service),
) -> AiReceiptParseResponse:
    if not payload.text_raw or not payload.text_raw.strip():
        raise HTTPException(status_code=400, detail="text_raw is required")

    try:
        return parser.parse(text_raw=payload.text_raw, fields_hint=payload.fields, boxes=payload.boxes)
    except Exception as e:
        logging.getLogger("app").exception("openai_receipt_parse_failed")
        msg = str(e) or "OpenAI receipt parse failed"
        if "api key" in msg.lower() and "not configured" in msg.lower():
            raise HTTPException(status_code=400, detail=msg) from e
        raise HTTPException(status_code=500, detail=msg) from e


@router.post("/ocr/ai/parse/stream")
async def ocr_ai_parse_stream_endpoint(
    payload: AiReceiptParseRequest,
    parser=Depends(get_openai_receipt_parser_service),
):
    if not payload.text_raw or not payload.text_raw.strip():
        raise HTTPException(status_code=400, detail="text_raw is required")

    def event_stream() -> Iterator[str]:
        try:
            for event in parser.parse_stream(text_raw=payload.text_raw, fields_hint=payload.fields, boxes=payload.boxes):
                yield json.dumps(event, ensure_ascii=False) + "\n"
        except Exception as e:
            logging.getLogger("app").exception("openai_receipt_parse_stream_failed")
            msg = str(e) or "OpenAI receipt parse failed"
            yield json.dumps({"type": "error", "detail": msg}, ensure_ascii=False) + "\n"

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache"},
    )
