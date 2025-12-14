from __future__ import annotations

import mimetypes
import uuid
from pathlib import Path

from fastapi import UploadFile


class StorageService:
    def __init__(self, uploads_dir: Path) -> None:
        self._uploads_dir = uploads_dir

    def save_upload(self, file: UploadFile, subdir: str) -> tuple[Path, str]:
        self._uploads_dir.mkdir(parents=True, exist_ok=True)
        target_dir = self._uploads_dir / subdir
        target_dir.mkdir(parents=True, exist_ok=True)

        content_type = file.content_type or "application/octet-stream"
        ext = Path(file.filename or "").suffix
        if not ext:
            guessed_ext = mimetypes.guess_extension(content_type) or ""
            ext = guessed_ext

        name = f"{uuid.uuid4().hex}{ext}"
        path = target_dir / name

        with path.open("wb") as f:
            f.write(file.file.read())

        rel_url = f"/uploads/{subdir}/{name}"
        return path, rel_url
