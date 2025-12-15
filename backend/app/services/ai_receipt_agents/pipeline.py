from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass
from typing import Any, Iterable, Optional

from app.models.ai_receipt import AiReceiptParseResponse
from app.models.ocr import OCRFields

from .json_utils import extract_json_object
from .openai_text_client import OpenAiTextClient
from .prompts import auditor_messages, organizer_messages, stylist_messages
from .types import ReceiptAiInput


@dataclass(frozen=True)
class ReceiptAiModels:
    organizer: str
    auditor: str
    stylist: str


class ReceiptAiPipeline:
    def __init__(
        self,
        *,
        llm: OpenAiTextClient,
        models: ReceiptAiModels,
        logger: Optional[logging.Logger] = None,
        max_json_retries: int = 1,
    ) -> None:
        self._llm = llm
        self._models = models
        self._log = logger or logging.getLogger("app")
        self._max_json_retries = max(0, int(max_json_retries))

    def _run_json(self, *, model: str, messages: list[dict[str, str]], stage: str) -> dict[str, Any]:
        last_err: Optional[Exception] = None
        for attempt in range(self._max_json_retries + 1):
            result = self._llm.run(model=model, messages=messages)
            try:
                return extract_json_object(result.text)
            except Exception as e:
                last_err = e
                messages = [
                    {"role": "system", "content": "Return ONLY valid JSON. No commentary."},
                    {
                        "role": "user",
                        "content": (
                            "Fix this into a single valid JSON object that matches the expected schema. "
                            "Return ONLY JSON.\n\n" + (result.text or "")
                        ),
                    },
                ]
                self._log.warning("receipt_ai_json_retry stage=%s attempt=%s err=%s", stage, attempt + 1, type(e).__name__)
        raise RuntimeError(f"AI stage '{stage}' did not return valid JSON") from last_err

    @staticmethod
    def _safe_text(s: Any) -> str:
        return (s if isinstance(s, str) else "").strip()

    def _to_response(self, data: dict[str, Any], fallback_text: str) -> AiReceiptParseResponse:
        fields = data.get("fields") or {}
        total = fields.get("total")
        if isinstance(total, str):
            m = re.search(r"-?\d[\d\.,]*", total)
            total = float(m.group(0).replace(",", ".")) if m else None

        out_fields = OCRFields(
            merchant=self._safe_text(fields.get("merchant")),
            date=self._safe_text(fields.get("date")),
            total=float(total) if isinstance(total, (int, float)) else None,
        )

        text_clean = self._safe_text(data.get("text_clean")) or self._safe_text(fallback_text)
        markdown = self._safe_text(data.get("markdown"))
        extra = data.get("data") if isinstance(data.get("data"), dict) else {}

        return AiReceiptParseResponse(fields=out_fields, text_clean=text_clean, markdown=markdown, data=extra)

    def parse(self, payload: ReceiptAiInput) -> AiReceiptParseResponse:
        t0 = time.perf_counter()
        self._log.info(
            "receipt_ai_pipeline_start organizer=%s auditor=%s stylist=%s text_raw_chars=%s",
            self._models.organizer,
            self._models.auditor,
            self._models.stylist,
            len(payload.text_raw or ""),
        )

        d1 = self._run_json(
            model=self._models.organizer,
            messages=organizer_messages(
                text_raw=payload.text_raw,
                fields_hint=payload.fields_hint,
                boxes=payload.boxes,
            ),
            stage="organizer",
        )

        d2 = self._run_json(
            model=self._models.auditor,
            messages=auditor_messages(
                previous_json=d1,
                text_raw=payload.text_raw,
                fields_hint=payload.fields_hint,
            ),
            stage="auditor",
        )

        d3 = self._run_json(
            model=self._models.stylist,
            messages=stylist_messages(previous_json=d2),
            stage="stylist",
        )

        self._log.info("receipt_ai_pipeline_done elapsed_ms=%s", int((time.perf_counter() - t0) * 1000))
        return self._to_response(d3, payload.text_raw)

    def parse_stream(self, payload: ReceiptAiInput) -> Iterable[dict[str, Any]]:
        t0 = time.perf_counter()

        def stage_label(stage: str) -> str:
            if stage == "organizer":
                return "Organizer (islandés)"
            if stage == "auditor":
                return "Auditor (coherencia)"
            if stage == "stylist":
                return "Stylist (markdown)"
            return stage

        yield {
            "type": "pipeline_start",
            "agents": {
                "organizer": self._models.organizer,
                "auditor": self._models.auditor,
                "stylist": self._models.stylist,
            },
        }

        yield {"type": "stage_start", "stage": "organizer", "agent": stage_label("organizer")}
        d1 = self._run_json(
            model=self._models.organizer,
            messages=organizer_messages(
                text_raw=payload.text_raw,
                fields_hint=payload.fields_hint,
                boxes=payload.boxes,
            ),
            stage="organizer",
        )
        notes1 = (d1.get("data") or {}).get("notes") if isinstance(d1.get("data"), dict) else None
        if isinstance(notes1, list):
            for n in notes1:
                if isinstance(n, str) and n.strip():
                    yield {"type": "note", "stage": "organizer", "agent": stage_label("organizer"), "text": n.strip()}
        yield {"type": "stage_end", "stage": "organizer", "agent": stage_label("organizer")}

        yield {
            "type": "handoff",
            "from_stage": "organizer",
            "to_stage": "auditor",
            "from_agent": stage_label("organizer"),
            "to_agent": stage_label("auditor"),
        }

        yield {"type": "stage_start", "stage": "auditor", "agent": stage_label("auditor")}
        d2 = self._run_json(
            model=self._models.auditor,
            messages=auditor_messages(
                previous_json=d1,
                text_raw=payload.text_raw,
                fields_hint=payload.fields_hint,
            ),
            stage="auditor",
        )
        notes2 = (d2.get("data") or {}).get("notes") if isinstance(d2.get("data"), dict) else None
        if isinstance(notes2, list):
            for n in notes2:
                if isinstance(n, str) and n.strip():
                    yield {"type": "note", "stage": "auditor", "agent": stage_label("auditor"), "text": n.strip()}
        yield {"type": "stage_end", "stage": "auditor", "agent": stage_label("auditor")}

        yield {
            "type": "handoff",
            "from_stage": "auditor",
            "to_stage": "stylist",
            "from_agent": stage_label("auditor"),
            "to_agent": stage_label("stylist"),
        }

        yield {"type": "stage_start", "stage": "stylist", "agent": stage_label("stylist")}
        d3 = self._run_json(
            model=self._models.stylist,
            messages=stylist_messages(previous_json=d2),
            stage="stylist",
        )
        notes3 = (d3.get("data") or {}).get("notes") if isinstance(d3.get("data"), dict) else None
        if isinstance(notes3, list):
            for n in notes3:
                if isinstance(n, str) and n.strip():
                    yield {"type": "note", "stage": "stylist", "agent": stage_label("stylist"), "text": n.strip()}
        yield {"type": "stage_end", "stage": "stylist", "agent": stage_label("stylist")}

        result = self._to_response(d3, payload.text_raw)
        yield {"type": "result", "data": result.model_dump()}
        yield {"type": "pipeline_done", "elapsed_ms": int((time.perf_counter() - t0) * 1000)}
