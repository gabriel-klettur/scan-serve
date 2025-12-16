from __future__ import annotations

import threading
import time
import uuid
from collections import deque
from dataclasses import dataclass
from typing import Optional

from app.models.ocr import BoundingBox, OCRFields, OCRResponse
from app.repositories.json_db import JsonDb
from app.services.google_vision_ocr_service import GoogleVisionOcrService
from app.services.ocr_service import OcrService


@dataclass(frozen=True)
class OcrQueueSnapshot:
    status: str
    queue_position: Optional[int]


@dataclass
class _OcrJob:
    id: str
    receipt_id: str
    image_url: str
    image_path: str
    engine: str
    status: str
    created_at_ms: int
    started_at_ms: Optional[int] = None
    finished_at_ms: Optional[int] = None
    error: Optional[str] = None


class OcrJobQueue:
    def __init__(
        self,
        db: JsonDb,
        ocr_service: OcrService,
        vision_ocr_service: GoogleVisionOcrService,
        max_concurrent: int = 1,
    ) -> None:
        self._db = db
        self._ocr_service = ocr_service
        self._vision_ocr_service = vision_ocr_service
        self._max_concurrent = max(1, int(max_concurrent))

        self._lock = threading.Lock()
        self._cv = threading.Condition(self._lock)
        self._queue: deque[str] = deque()
        self._jobs: dict[str, _OcrJob] = {}
        self._active: set[str] = set()

        self._threads: list[threading.Thread] = []
        self._started = False
        self._stop = False

    def start(self) -> None:
        with self._lock:
            if self._started:
                return
            self._started = True

        for i in range(self._max_concurrent):
            t = threading.Thread(target=self._worker_loop, name=f"ocr-queue-{i}", daemon=True)
            t.start()
            self._threads.append(t)

    def enqueue(self, receipt_id: str, image_url: str, image_path: str, engine: str) -> str:
        job_id = uuid.uuid4().hex
        now = int(time.time() * 1000)
        job = _OcrJob(
            id=job_id,
            receipt_id=receipt_id,
            image_url=image_url,
            image_path=image_path,
            engine=engine,
            status="queued",
            created_at_ms=now,
        )
        with self._cv:
            self._jobs[job_id] = job
            self._queue.append(job_id)
            self._cv.notify_all()
        return job_id

    def snapshot_for_job(self, job_id: str) -> OcrQueueSnapshot:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return OcrQueueSnapshot(status="unknown", queue_position=None)

            if job.status == "queued":
                try:
                    idx = list(self._queue).index(job_id)
                except ValueError:
                    idx = None
                return OcrQueueSnapshot(status="queued", queue_position=None if idx is None else idx + 1)

            if job.status == "processing":
                return OcrQueueSnapshot(status="processing", queue_position=0)

            if job.status == "done":
                return OcrQueueSnapshot(status="done", queue_position=None)

            if job.status == "error":
                return OcrQueueSnapshot(status="error", queue_position=None)

            return OcrQueueSnapshot(status=job.status, queue_position=None)

    def snapshot_for_receipt(self, receipt_id: str) -> OcrQueueSnapshot:
        with self._lock:
            job = next((j for j in self._jobs.values() if j.receipt_id == receipt_id), None)
            if not job:
                return OcrQueueSnapshot(status="unknown", queue_position=None)
        return self.snapshot_for_job(job.id)

    def _worker_loop(self) -> None:
        while True:
            with self._cv:
                while not self._stop and not self._queue:
                    self._cv.wait(timeout=0.5)
                if self._stop:
                    return
                job_id = self._queue.popleft()
                self._active.add(job_id)
                job = self._jobs.get(job_id)
                if not job:
                    self._active.discard(job_id)
                    continue
                job.status = "processing"
                job.started_at_ms = int(time.time() * 1000)

            try:
                ocr = self._compute_ocr(job)
                self._persist_ocr(job, ocr)
                with self._lock:
                    job.status = "done"
                    job.finished_at_ms = int(time.time() * 1000)
            except Exception as e:
                err = str(e)
                self._persist_error(job, err)
                with self._lock:
                    job.status = "error"
                    job.error = err
                    job.finished_at_ms = int(time.time() * 1000)
            finally:
                with self._cv:
                    self._active.discard(job_id)
                    self._cv.notify_all()

    def _compute_ocr(self, job: _OcrJob) -> OCRResponse:
        vision_lines = []
        easy_lines = []

        if job.engine in {"vision", "both"}:
            if not getattr(self._vision_ocr_service, "_config", None) or not self._vision_ocr_service._config.api_key:  # type: ignore[attr-defined]
                raise RuntimeError("Google Vision API key is not configured")
            vision_lines = self._vision_ocr_service.read(job.image_path)

        if job.engine in {"easyocr", "both"}:
            easy_lines = self._ocr_service.read(job.image_path)

        lines = vision_lines if vision_lines else easy_lines
        text_lines = [l.text for l in lines]
        text_raw = "\n".join(text_lines)
        conf_avg = (sum(l.confidence for l in lines) / len(lines)) if lines else 0.0

        if job.engine == "both" and easy_lines:
            combined_text = "\n".join([l.text for l in (vision_lines + easy_lines)])
        else:
            combined_text = text_raw

        fields = OCRFields(
            merchant=self._ocr_service.guess_merchant(text_lines),
            date=self._ocr_service.guess_date(text_raw) or self._ocr_service.guess_date(combined_text),
            total=self._ocr_service.guess_total(text_raw) or self._ocr_service.guess_total(combined_text),
        )

        boxes = [BoundingBox(text=l.text, bbox=l.bbox, confidence=l.confidence) for l in lines]
        return OCRResponse(
            original_image_url=job.image_url,
            processed_image_url=job.image_url,
            text_raw=text_raw,
            confidence_avg=float(conf_avg),
            fields=fields,
            boxes=boxes,
        )

    def _persist_ocr(self, job: _OcrJob, ocr: OCRResponse) -> None:
        def mutate(data):
            receipts = data.get("receipts", [])
            for i, r in enumerate(receipts):
                if r.get("id") == job.receipt_id:
                    updated = {
                        **r,
                        "ocr": ocr.model_dump(),
                        "ocrStatus": "done",
                        "ocrJobId": job.id,
                        "ocrError": None,
                        "updatedAt": int(time.time() * 1000),
                    }
                    receipts[i] = updated
                    data["receipts"] = receipts
                    return data
            raise KeyError("Receipt not found")

        self._db.mutate(mutate)

    def _persist_error(self, job: _OcrJob, err: str) -> None:
        def mutate(data):
            receipts = data.get("receipts", [])
            for i, r in enumerate(receipts):
                if r.get("id") == job.receipt_id:
                    updated = {
                        **r,
                        "ocr": None,
                        "ocrStatus": "error",
                        "ocrJobId": job.id,
                        "ocrError": err,
                        "updatedAt": int(time.time() * 1000),
                    }
                    receipts[i] = updated
                    data["receipts"] = receipts
                    return data
            raise KeyError("Receipt not found")

        self._db.mutate(mutate)
