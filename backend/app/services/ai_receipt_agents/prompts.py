from __future__ import annotations

import json
from typing import Any, Optional

from app.models.ocr import BoundingBox, OCRFields


def _hint(fields_hint: Optional[OCRFields]) -> dict[str, Any]:
    return {
        "merchant": getattr(fields_hint, "merchant", None) if fields_hint else None,
        "date": getattr(fields_hint, "date", None) if fields_hint else None,
        "total": getattr(fields_hint, "total", None) if fields_hint else None,
    }


def organizer_messages(*, text_raw: str, fields_hint: Optional[OCRFields], boxes: Optional[list[BoundingBox]]) -> list[dict[str, str]]:
    system = (
        "You are an expert Icelandic supermarket receipt OCR normalizer. "
        "Your job is to reconstruct the most likely correct reading order and spacing from noisy OCR, "
        "using Icelandic context and typical receipt structure. "
        "Return ONLY valid JSON. No markdown fences. No commentary."
    )

    user = {
        "task": "Reorder and normalize OCR text from an Icelandic supermarket receipt.",
        "input": {
            "text_raw": text_raw,
            "fields_hint": _hint(fields_hint),
            "boxes": [b.model_dump() for b in boxes] if boxes else None,
        },
        "output_schema": {
            "fields": {"merchant": "string|null", "date": "string|null", "total": "number|null"},
            "text_clean": "string",
            "markdown": "string",
            "data": {
                "language": "string",
                "sections": "array",
                "notes": "array",
                "warnings": "array",
            },
        },
        "requirements": [
            "markdown MUST be organized into named sections using headings (e.g. '# Merchant', '# Items', '# Totals', '# Payment', '# Metadata').",
            "Fix spacing, line breaks, and word order when obvious OCR mistakes occur.",
            "Keep the original meaning; do not invent items.",
            "Prefer Icelandic keywords and common receipt patterns (e.g., Samtals, Kort, VSK, Dags., Kl.).",
            "If boxes are provided, use them to infer reading order but do not output geometry.",
            "In data.notes, provide 3-8 short bullet-like strings describing high-level actions taken (NOT internal reasoning).",
        ],
    }

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": json.dumps(user, ensure_ascii=False)},
    ]


def auditor_messages(*, previous_json: dict[str, Any], text_raw: str, fields_hint: Optional[OCRFields]) -> list[dict[str, str]]:
    system = (
        "You are a strict receipt auditor. "
        "Validate and correct the receipt representation so it is internally consistent and plausible. "
        "Fix section assignment and wording when inconsistent. "
        "Return ONLY valid JSON. No markdown fences. No commentary."
    )

    user = {
        "task": "Audit and correct a parsed Icelandic supermarket receipt.",
        "input": {
            "previous": previous_json,
            "text_raw": text_raw,
            "fields_hint": _hint(fields_hint),
        },
        "output_schema": {
            "fields": {"merchant": "string|null", "date": "string|null", "total": "number|null"},
            "text_clean": "string",
            "markdown": "string",
            "data": "object",
        },
        "checks": [
            "Totals should make sense (if VAT/subtotals exist, avoid contradictions).",
            "Dates should be plausible and formatted consistently.",
            "Merchant name should be plausible (prefer top-of-receipt lines).",
            "Sections must be named and content must belong to the right section.",
        ],
        "requirements": [
            "If unsure, keep the content but add warnings in data.warnings.",
            "Do not invent missing numbers.",
            "In data.notes, provide 3-8 short bullet-like strings describing what was checked/fixed (NOT internal reasoning).",
        ],
    }

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": json.dumps(user, ensure_ascii=False)},
    ]


def stylist_messages(*, previous_json: dict[str, Any]) -> list[dict[str, str]]:
    system = (
        "You are a professional technical editor for receipt markdown. "
        "Improve the markdown formatting, typography, and hierarchy. "
        "Keep semantics identical. "
        "Return ONLY valid JSON. No markdown fences. No commentary."
    )

    user = {
        "task": "Improve markdown style and layout for a receipt while preserving content.",
        "input": {
            "previous": previous_json,
        },
        "output_schema": {
            "fields": {"merchant": "string|null", "date": "string|null", "total": "number|null"},
            "text_clean": "string",
            "markdown": "string",
            "data": "object",
        },
        "style_requirements": [
            "Use consistent heading levels.",
            "Use tables for line items if present.",
            "Avoid excessive blank lines.",
            "Use clear section titles.",
            "In data.notes, provide 3-8 short bullet-like strings describing what was improved (NOT internal reasoning).",
        ],
    }

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": json.dumps(user, ensure_ascii=False)},
    ]
