from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class OcrLine:
    text: str
    bbox: list[list[float]]
    confidence: float


class OcrService:
    def __init__(self, languages: list[str]) -> None:
        self._languages = languages
        self._reader = None

    def _get_reader(self):
        if self._reader is not None:
            return self._reader

        try:
            import easyocr  # type: ignore
        except Exception as e:  # pragma: no cover
            raise RuntimeError("easyocr is not available. Install backend requirements.") from e

        self._reader = easyocr.Reader(self._languages)
        return self._reader

    def read(self, image_path: str) -> list[OcrLine]:
        reader = self._get_reader()
        results = reader.readtext(image_path)
        lines: list[OcrLine] = []
        for bbox, text, conf in results:
            lines.append(OcrLine(text=text, bbox=[[float(x), float(y)] for x, y in bbox], confidence=float(conf) * 100.0))
        return lines

    @staticmethod
    def guess_merchant(text_lines: list[str]) -> Optional[str]:
        for line in text_lines[:5]:
            cleaned = line.strip()
            if cleaned and len(cleaned) >= 3:
                return cleaned
        return None

    @staticmethod
    def guess_date(text: str) -> Optional[str]:
        patterns = [
            r"\b(\d{2}[./-]\d{2}[./-]\d{2,4})\b",
            r"\b(\d{4}[./-]\d{2}[./-]\d{2})\b",
        ]
        for p in patterns:
            m = re.search(p, text)
            if m:
                return m.group(1)
        return None

    @staticmethod
    def guess_total(text: str) -> Optional[float]:
        keywords = [
            "samtals",
            "heild",
            "total",
            "alls",
        ]

        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        candidates: list[float] = []

        for ln in lines:
            ln_lower = ln.lower()
            if any(k in ln_lower for k in keywords):
                nums = re.findall(r"(\d+[\.,]\d{2})", ln)
                for n in nums:
                    try:
                        candidates.append(float(n.replace(",", ".")))
                    except ValueError:
                        pass

        if candidates:
            return max(candidates)

        all_nums = re.findall(r"(\d+[\.,]\d{2})", text)
        parsed = []
        for n in all_nums:
            try:
                parsed.append(float(n.replace(",", ".")))
            except ValueError:
                pass

        return max(parsed) if parsed else None
