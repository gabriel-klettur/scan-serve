from __future__ import annotations

import base64
import json
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from statistics import median
from typing import Any, Optional

from app.core.logger import get_logger
from app.services.ocr_service import OcrLine


@dataclass(frozen=True)
class GoogleVisionOcrConfig:
    api_key: str
    language_hints: list[str]
    timeout_seconds: float = 20.0
    max_retries: int = 2


class GoogleVisionOcrService:
    def __init__(self, config: GoogleVisionOcrConfig) -> None:
        self._config = config
        self._logger = get_logger("google_vision_ocr")

    def read(self, image_path: str) -> list[OcrLine]:
        self._logger.info("vision_ocr_start image_path=%s", image_path)
        try:
            payload = self._build_payload(image_path=image_path)
            data = self._post_annotate(payload)
            lines = self._parse_response(data)
            self._logger.info("vision_ocr_done lines=%s", len(lines))
            return lines
        except Exception:
            self._logger.exception("vision_ocr_failed")
            raise

    def _build_payload(self, image_path: str) -> dict[str, Any]:
        with open(image_path, "rb") as f:
            encoded = base64.b64encode(f.read()).decode("utf-8")

        request: dict[str, Any] = {
            "image": {"content": encoded},
            "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
        }
        if self._config.language_hints:
            request["imageContext"] = {"languageHints": self._config.language_hints}

        return {"requests": [request]}

    def _post_annotate(self, payload: dict[str, Any]) -> dict[str, Any]:
        url = f"https://vision.googleapis.com/v1/images:annotate?key={self._config.api_key}"
        body = json.dumps(payload).encode("utf-8")

        last_err: Optional[Exception] = None
        for attempt in range(self._config.max_retries + 1):
            try:
                req = urllib.request.Request(
                    url,
                    data=body,
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=self._config.timeout_seconds) as resp:
                    raw = resp.read().decode("utf-8")
                    return json.loads(raw)
            except urllib.error.HTTPError as e:
                try:
                    err_body = e.read().decode("utf-8", errors="replace")
                except Exception:
                    err_body = ""

                msg = f"HTTP {e.code} {getattr(e, 'reason', '')}".strip()
                if err_body:
                    msg = f"{msg} - {err_body}"

                self._logger.error("vision_ocr_http_error %s", msg)
                last_err = RuntimeError(msg)
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
                last_err = e
                if attempt >= self._config.max_retries:
                    break
                time.sleep(0.6 * (2**attempt))

        self._logger.error("vision_ocr_request_failed %s", last_err)
        raise RuntimeError(f"Google Vision OCR request failed: {last_err}")

    def _parse_response(self, data: dict[str, Any]) -> list[OcrLine]:
        responses = data.get("responses")
        if not isinstance(responses, list) or not responses:
            raise RuntimeError("Google Vision OCR: missing responses")

        first = responses[0]
        if isinstance(first, dict) and first.get("error"):
            raise RuntimeError(f"Google Vision OCR error: {first['error']}")

        annotations = first.get("textAnnotations") if isinstance(first, dict) else None
        if not isinstance(annotations, list) or not annotations:
            return []

        words = []
        for ann in annotations[1:]:
            if not isinstance(ann, dict):
                continue
            text = ann.get("description")
            poly = ann.get("boundingPoly")
            if not isinstance(text, str) or not isinstance(poly, dict):
                continue
            vertices = poly.get("vertices")
            if not isinstance(vertices, list) or not vertices:
                continue
            xs = [float(v.get("x", 0.0)) for v in vertices if isinstance(v, dict)]
            ys = [float(v.get("y", 0.0)) for v in vertices if isinstance(v, dict)]
            if not xs or not ys:
                continue
            x1, x2 = min(xs), max(xs)
            y1, y2 = min(ys), max(ys)
            words.append(
                {
                    "text": text,
                    "x1": x1,
                    "y1": y1,
                    "x2": x2,
                    "y2": y2,
                    "cx": (x1 + x2) / 2.0,
                    "cy": (y1 + y2) / 2.0,
                    "h": max(1.0, y2 - y1),
                }
            )

        if not words:
            full = annotations[0].get("description") if isinstance(annotations[0], dict) else ""
            full_text = full if isinstance(full, str) else ""
            if not full_text:
                return []
            return [OcrLine(text=ln, bbox=[[0.0, 0.0]] * 4, confidence=90.0) for ln in full_text.splitlines() if ln.strip()]

        words.sort(key=lambda w: (w["cy"], w["cx"]))
        base_height = median([w["h"] for w in words]) if len(words) >= 3 else words[0]["h"]
        threshold = max(6.0, base_height * 0.6)

        lines: list[dict[str, Any]] = []
        for w in words:
            if not lines:
                lines.append(self._new_line(w))
                continue
            last = lines[-1]
            if abs(float(w["cy"]) - float(last["cy"])) <= threshold:
                self._append_word(last, w)
            else:
                lines.append(self._new_line(w))

        result: list[OcrLine] = []
        for ln in lines:
            text = " ".join(ln["words"]).strip()
            if not text:
                continue
            x1, y1, x2, y2 = float(ln["x1"]), float(ln["y1"]), float(ln["x2"]), float(ln["y2"])
            bbox = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]
            result.append(OcrLine(text=text, bbox=bbox, confidence=90.0))
        return result

    @staticmethod
    def _new_line(w: dict[str, Any]) -> dict[str, Any]:
        return {
            "words": [w["text"]],
            "x1": w["x1"],
            "y1": w["y1"],
            "x2": w["x2"],
            "y2": w["y2"],
            "cy": w["cy"],
        }

    @staticmethod
    def _append_word(line: dict[str, Any], w: dict[str, Any]) -> None:
        line["words"].append(w["text"])
        line["x1"] = min(float(line["x1"]), float(w["x1"]))
        line["y1"] = min(float(line["y1"]), float(w["y1"]))
        line["x2"] = max(float(line["x2"]), float(w["x2"]))
        line["y2"] = max(float(line["y2"]), float(w["y2"]))
        line["cy"] = (float(line["cy"]) * 0.7) + (float(w["cy"]) * 0.3)
