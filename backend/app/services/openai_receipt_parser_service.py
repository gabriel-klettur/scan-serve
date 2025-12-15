from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Optional

from openai import OpenAI

from app.models.ai_receipt import AiReceiptParseResponse
from app.models.ocr import OCRFields


@dataclass(frozen=True)
class OpenAiReceiptParserConfig:
    api_key: str
    model: str = "gpt-5-mini"


class OpenAiReceiptParserService:
    def __init__(self, config: OpenAiReceiptParserConfig) -> None:
        self._config = config
        self._client = OpenAI(api_key=config.api_key) if config.api_key else None

    @staticmethod
    def _extract_json(text: str) -> dict[str, Any]:
        t = text.strip()
        if not t:
            raise ValueError("Empty model response")

        start = t.find("{")
        end = t.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ValueError("Model did not return JSON")

        payload = t[start : end + 1]
        return json.loads(payload)

    @staticmethod
    def _safe_text(s: Optional[str]) -> str:
        return (s or "").strip()

    def parse(self, text_raw: str, fields_hint: Optional[OCRFields] = None) -> AiReceiptParseResponse:
        if not self._client:
            raise RuntimeError("OpenAI API key is not configured")

        hint = {
            "merchant": getattr(fields_hint, "merchant", None) if fields_hint else None,
            "date": getattr(fields_hint, "date", None) if fields_hint else None,
            "total": getattr(fields_hint, "total", None) if fields_hint else None,
        }

        system = (
            "You are a receipt parsing engine. Return ONLY valid JSON. "
            "Do not include markdown fences or commentary. "
            "Normalize Icelandic receipts when possible (keywords like Samtals, Kort, VSK)."
        )

        user = {
            "task": "Parse and improve OCR receipt text.",
            "input": {
                "text_raw": text_raw,
                "fields_hint": hint,
            },
            "output_schema": {
                "fields": {"merchant": "string|null", "date": "string|null", "total": "number|null"},
                "text_clean": "string",
                "markdown": "string",
                "data": "object",
            },
            "requirements": [
                "text_clean must be human-readable with corrected spacing and line breaks.",
                "markdown should include sections and a table if line items are present.",
                "fields.total must be numeric if present.",
            ],
        }

        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": json.dumps(user, ensure_ascii=False)},
        ]

        # SDK compatibility: some installed versions do not expose the Responses API.
        if hasattr(self._client, "responses"):
            response = self._client.responses.create(
                model=self._config.model,
                input=messages,
            )

            text_out = getattr(response, "output_text", None)
            if not isinstance(text_out, str) or not text_out.strip():
                text_out = json.dumps(getattr(response, "output", None), ensure_ascii=False)
        else:
            completion = self._client.chat.completions.create(
                model=self._config.model,
                messages=messages,
            )
            msg = completion.choices[0].message
            text_out = msg.content or ""

        data = self._extract_json(text_out)

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

        return AiReceiptParseResponse(
            fields=out_fields,
            text_clean=self._safe_text(data.get("text_clean")) or self._safe_text(text_raw),
            markdown=self._safe_text(data.get("markdown")),
            data=data.get("data") if isinstance(data.get("data"), dict) else {},
        )
