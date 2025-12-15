from __future__ import annotations

import json
from typing import Any


def extract_json_object(text: str) -> dict[str, Any]:
    t = (text or "").strip()
    if not t:
        raise ValueError("Empty model response")

    if "```" in t:
        t = t.replace("```json", "```").replace("```JSON", "```")
        parts = [p.strip() for p in t.split("```") if p.strip()]
        if parts:
            t = parts[0]

    start = t.find("{")
    end = t.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("Model did not return JSON")

    payload = t[start : end + 1]
    return json.loads(payload)
