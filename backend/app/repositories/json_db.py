from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any


class JsonDb:
    def __init__(self, path: Path) -> None:
        self._path = path
        self._lock = threading.Lock()

    def _ensure_file(self) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        if not self._path.exists():
            self._path.write_text(json.dumps({"folders": [], "receipts": []}, indent=2), encoding="utf-8")

    def read(self) -> dict[str, Any]:
        with self._lock:
            self._ensure_file()
            return json.loads(self._path.read_text(encoding="utf-8"))

    def write(self, data: dict[str, Any]) -> None:
        with self._lock:
            self._ensure_file()
            tmp = self._path.with_suffix(".tmp")
            tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
            tmp.replace(self._path)

    def mutate(self, fn):
        with self._lock:
            self._ensure_file()
            data = json.loads(self._path.read_text(encoding="utf-8"))
            new_data = fn(data)
            tmp = self._path.with_suffix(".tmp")
            tmp.write_text(json.dumps(new_data, ensure_ascii=False, indent=2), encoding="utf-8")
            tmp.replace(self._path)
            return new_data
