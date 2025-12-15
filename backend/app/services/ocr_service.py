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
        def parse_amount(raw: str) -> Optional[float]:
            s = raw.strip()
            if not s:
                return None

            # Keep only digits, separators and sign.
            s = re.sub(r"[^0-9,\.\-]", "", s)
            if not s or s in {"-", ".", ","}:
                return None

            neg = s.startswith("-")
            s = s.lstrip("-")
            if not s:
                return None

            # If both separators exist, infer decimal separator as the last occurring one.
            if "." in s and "," in s:
                last_dot = s.rfind(".")
                last_comma = s.rfind(",")
                if last_dot > last_comma:
                    thousands_sep = ","
                    decimal_sep = "."
                else:
                    thousands_sep = "."
                    decimal_sep = ","
                s = s.replace(thousands_sep, "")
                s = s.replace(decimal_sep, ".")
                try:
                    v = float(s)
                    return -v if neg else v
                except ValueError:
                    return None

            # Single separator cases.
            if "." in s:
                parts = s.split(".")
                # Pattern like 4.496 or 12.345.678 -> thousands groups.
                if len(parts) >= 2 and all(len(p) == 3 for p in parts[1:]):
                    try:
                        v = float("".join(parts))
                        return -v if neg else v
                    except ValueError:
                        return None
                try:
                    v = float(s)
                    return -v if neg else v
                except ValueError:
                    return None

            if "," in s:
                parts = s.split(",")
                if len(parts) >= 2 and all(len(p) == 3 for p in parts[1:]):
                    try:
                        v = float("".join(parts))
                        return -v if neg else v
                    except ValueError:
                        return None
                try:
                    v = float(s.replace(",", "."))
                    return -v if neg else v
                except ValueError:
                    return None

            try:
                v = float(s)
                return -v if neg else v
            except ValueError:
                return None

        def extract_amounts(line: str) -> list[float]:
            # Accept forms like: 4.496, -4.496, 4496, 1.234,56, etc.
            tokens = re.findall(r"-?\d[\d\.,]*", line)
            out: list[float] = []
            for t in tokens:
                v = parse_amount(t)
                if v is not None:
                    out.append(v)
            return out

        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

        # Strong business rules for Icelandic receipts.
        for ln in lines:
            if "samtals" in ln.lower():
                amounts = extract_amounts(ln)
                if amounts:
                    return abs(amounts[-1])

        for ln in lines:
            if re.search(r"\bkort\b", ln.lower()):
                amounts = extract_amounts(ln)
                if amounts:
                    return abs(amounts[-1])

        # Fallback heuristic.
        keywords = [
            "heild",
            "total",
            "alls",
            "upphæð",
            "subtotal",
        ]

        candidates: list[float] = []
        for ln in lines:
            ln_lower = ln.lower()
            if any(k in ln_lower for k in keywords):
                candidates.extend([abs(v) for v in extract_amounts(ln)])

        if candidates:
            return max(candidates)

        all_candidates = [abs(v) for ln in lines for v in extract_amounts(ln)]
        return max(all_candidates) if all_candidates else None
