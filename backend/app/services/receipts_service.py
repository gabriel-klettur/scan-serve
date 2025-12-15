from __future__ import annotations

import time
import uuid
from typing import Optional

from app.models.folders import ReceiptFolder
from app.models.ocr import BoundingBox, OCRFields, OCRResponse
from app.models.receipts import Receipt
from app.repositories.json_db import JsonDb
from app.services.google_vision_ocr_service import GoogleVisionOcrService
from app.services.ocr_service import OcrService


class ReceiptsService:
    def __init__(self, db: JsonDb, ocr_service: OcrService, vision_ocr_service: GoogleVisionOcrService) -> None:
        self._db = db
        self._ocr_service = ocr_service
        self._vision_ocr_service = vision_ocr_service

    def list_folders(self) -> list[ReceiptFolder]:
        data = self._db.read()
        folders = [ReceiptFolder(**f) for f in data.get("folders", [])]
        folders.sort(key=lambda f: f.updatedAt, reverse=True)
        return folders

    def create_folder(self, name: str) -> ReceiptFolder:
        now = int(time.time() * 1000)
        folder = ReceiptFolder(id=uuid.uuid4().hex, name=name.strip(), createdAt=now, updatedAt=now)

        def mutate(data):
            data.setdefault("folders", []).append(folder.model_dump())
            return data

        self._db.mutate(mutate)
        return folder

    def update_folder(self, folder_id: str, name: str) -> ReceiptFolder:
        name = name.strip()

        def mutate(data):
            folders = data.get("folders", [])
            for i, f in enumerate(folders):
                if f.get("id") == folder_id:
                    updated = {**f, "name": name, "updatedAt": int(time.time() * 1000)}
                    folders[i] = updated
                    data["folders"] = folders
                    return data
            raise KeyError("Folder not found")

        new_data = self._db.mutate(mutate)
        folder = next(f for f in new_data["folders"] if f["id"] == folder_id)
        return ReceiptFolder(**folder)

    def delete_folder(self, folder_id: str) -> None:
        def mutate(data):
            data["folders"] = [f for f in data.get("folders", []) if f.get("id") != folder_id]
            receipts = data.get("receipts", [])
            for r in receipts:
                if r.get("folderId") == folder_id:
                    r["folderId"] = None
                    r["updatedAt"] = int(time.time() * 1000)
            data["receipts"] = receipts
            return data

        self._db.mutate(mutate)

    def list_receipts(self, folder_id: Optional[str]) -> list[Receipt]:
        data = self._db.read()
        receipts = [Receipt(**r) for r in data.get("receipts", [])]
        if folder_id is not None:
            receipts = [r for r in receipts if r.folderId == folder_id]
        receipts.sort(key=lambda r: r.createdAt, reverse=True)
        return receipts

    def add_receipt(
        self,
        folder_id: Optional[str],
        original_file_name: str,
        mime_type: str,
        image_url: str,
        ocr_image_path: str,
        run_ocr: bool,
        ocr_engine: str = "easyocr",
    ) -> Receipt:
        now = int(time.time() * 1000)

        ocr: Optional[OCRResponse] = None
        if run_ocr:
            if ocr_engine in {"vision", "both"}:
                if not getattr(self._vision_ocr_service, "_config", None) or not self._vision_ocr_service._config.api_key:  # type: ignore[attr-defined]
                    raise RuntimeError("Google Vision API key is not configured")
                vision_lines = self._vision_ocr_service.read(ocr_image_path)
            else:
                vision_lines = []

            if ocr_engine in {"easyocr", "both"}:
                easy_lines = self._ocr_service.read(ocr_image_path)
            else:
                easy_lines = []

            lines = vision_lines if vision_lines else easy_lines
            text_lines = [l.text for l in lines]
            text_raw = "\n".join(text_lines)
            conf_avg = (sum(l.confidence for l in lines) / len(lines)) if lines else 0.0

            if ocr_engine == "both" and easy_lines:
                combined_text = "\n".join([l.text for l in (vision_lines + easy_lines)])
            else:
                combined_text = text_raw

            fields = OCRFields(
                merchant=self._ocr_service.guess_merchant(text_lines),
                date=self._ocr_service.guess_date(text_raw) or self._ocr_service.guess_date(combined_text),
                total=self._ocr_service.guess_total(text_raw) or self._ocr_service.guess_total(combined_text),
            )

            boxes = [BoundingBox(text=l.text, bbox=l.bbox, confidence=l.confidence) for l in lines]
            ocr = OCRResponse(
                original_image_url=image_url,
                processed_image_url=image_url,
                text_raw=text_raw,
                confidence_avg=float(conf_avg),
                fields=fields,
                boxes=boxes,
            )

        receipt = Receipt(
            id=uuid.uuid4().hex,
            folderId=folder_id,
            createdAt=now,
            updatedAt=now,
            originalFileName=original_file_name,
            mimeType=mime_type,
            image_url=image_url,
            ocr=ocr,
        )

        def mutate(data):
            data.setdefault("receipts", []).append(receipt.model_dump())
            return data

        self._db.mutate(mutate)
        return receipt

    def update_receipt_folder(self, receipt_id: str, folder_id: Optional[str]) -> Receipt:
        def mutate(data):
            receipts = data.get("receipts", [])
            for i, r in enumerate(receipts):
                if r.get("id") == receipt_id:
                    updated = {**r, "folderId": folder_id, "updatedAt": int(time.time() * 1000)}
                    receipts[i] = updated
                    data["receipts"] = receipts
                    return data
            raise KeyError("Receipt not found")

        new_data = self._db.mutate(mutate)
        receipt = next(r for r in new_data["receipts"] if r["id"] == receipt_id)
        return Receipt(**receipt)

    def delete_receipt(self, receipt_id: str) -> None:
        def mutate(data):
            data["receipts"] = [r for r in data.get("receipts", []) if r.get("id") != receipt_id]
            return data

        self._db.mutate(mutate)
