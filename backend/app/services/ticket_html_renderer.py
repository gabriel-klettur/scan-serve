from __future__ import annotations

import html
from dataclasses import dataclass
from typing import Optional

from app.services.ocr_service import OcrLine


@dataclass(frozen=True)
class TicketHtmlRenderConfig:
    max_width_px: int = 420
    background_opacity: float = 0.18


class TicketHtmlRenderer:
    def __init__(self, config: Optional[TicketHtmlRenderConfig] = None) -> None:
        self._config = config or TicketHtmlRenderConfig()

    def render(
        self,
        *,
        image_url: str,
        image_path: str,
        lines: list[OcrLine],
        max_width_px: Optional[int] = None,
        background_opacity: Optional[float] = None,
    ) -> str:
        width, height = self._get_image_size(image_path)
        if width <= 0 or height <= 0:
            raise RuntimeError("Invalid image dimensions")

        rendered_lines = []
        for idx, ln in enumerate(lines):
            rect = self._bbox_to_rect(ln.bbox)
            if rect is None:
                continue
            x1, y1, x2, y2 = rect
            left = (x1 / width) * 100.0
            top = (y1 / height) * 100.0
            w_pct = ((x2 - x1) / width) * 100.0
            h_pct = ((y2 - y1) / height) * 100.0
            font_px = max(10.0, (y2 - y1) * 0.78)

            safe_text = html.escape(ln.text)
            rendered_lines.append(
                """
<div class=\"ln\" style=\"left:{left:.4f}%;top:{top:.4f}%;width:{w:.4f}%;height:{h:.4f}%;font-size:{fs:.2f}px\" data-i=\"{i}\">{t}</div>
""".strip().format(
                    left=left,
                    top=top,
                    w=w_pct,
                    h=h_pct,
                    fs=font_px,
                    i=idx,
                    t=safe_text,
                )
            )

        eff_background_opacity = self._config.background_opacity if background_opacity is None else float(background_opacity)
        eff_max_width_px = self._config.max_width_px if max_width_px is None else int(max_width_px)

        background_opacity = min(max(eff_background_opacity, 0.0), 1.0)
        max_width_px = max(240, int(eff_max_width_px))

        if not rendered_lines:
            text_raw = "\n".join([ln.text for ln in lines if ln.text.strip()])
            safe_text_raw = html.escape(text_raw)
            rendered_lines = [
                (
                    "<pre class=\"fallback\">" + safe_text_raw + "</pre>"
                    if safe_text_raw
                    else "<pre class=\"fallback\"></pre>"
                )
            ]

        return (
            """<!doctype html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>Receipt</title>
  <style>
    :root { --ticket-max-width: """
            + str(max_width_px)
            + """px; }
    body { margin: 0; padding: 16px; background: #f6f6f6; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace; }
    .frame { display: flex; justify-content: center; }
    .ticket {
      width: 100%;
      max-width: var(--ticket-max-width);
      position: relative;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0,0,0,0.12);
      background: #fff;
    }
    .ticket::before {
      content: \"\";
      position: absolute;
      inset: 0;
      background-image: url('"""
            + html.escape(image_url)
            + """');
      background-repeat: no-repeat;
      background-position: top left;
      background-size: 100% 100%;
      opacity: """
            + str(background_opacity)
            + """;
      filter: grayscale(0.1) contrast(1.05);
      pointer-events: none;
    }
    .canvas {
      position: relative;
      width: 100%;
      aspect-ratio: """
            + str(width)
            + "/"
            + str(height)
            + """;
    }
    .ln {
      position: absolute;
      color: #111;
      white-space: pre;
      line-height: 1.0;
      letter-spacing: 0.01em;
      text-rendering: geometricPrecision;
      -webkit-font-smoothing: antialiased;
      text-shadow: 0 0 0.6px rgba(0,0,0,0.28);
      padding: 0;
      margin: 0;
    }
    .fallback {
      position: absolute;
      left: 4.0%;
      top: 3.0%;
      width: 92.0%;
      margin: 0;
      white-space: pre-wrap;
      line-height: 1.15;
      font-size: 12px;
      color: #111;
    }
  </style>
</head>
<body>
  <div class=\"frame\">
    <div class=\"ticket\">
      <div class=\"canvas\">
"""
            + "\n".join(rendered_lines)
            + """
      </div>
    </div>
  </div>
</body>
</html>"""
        )

    @staticmethod
    def _bbox_to_rect(bbox: list[list[float]]) -> Optional[tuple[float, float, float, float]]:
        if not isinstance(bbox, list) or len(bbox) < 4:
            return None
        xs: list[float] = []
        ys: list[float] = []
        for pt in bbox[:4]:
            if not isinstance(pt, list) or len(pt) < 2:
                continue
            try:
                xs.append(float(pt[0]))
                ys.append(float(pt[1]))
            except (TypeError, ValueError):
                continue
        if not xs or not ys:
            return None
        x1, x2 = min(xs), max(xs)
        y1, y2 = min(ys), max(ys)
        if x2 <= x1 or y2 <= y1:
            return None
        return x1, y1, x2, y2

    @staticmethod
    def _get_image_size(image_path: str) -> tuple[int, int]:
        try:
            from PIL import Image  # type: ignore

            with Image.open(image_path) as img:
                w, h = img.size
                return int(w), int(h)
        except Exception as e:
            raise RuntimeError(f"Failed to read image size: {e}") from e
