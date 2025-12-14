from __future__ import annotations

import contextvars
import datetime as _dt
import json
import logging
import logging.config
import os
import re
import shutil
from pathlib import Path
from typing import Any


request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")


class RequestIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:  # noqa: A003
        record.request_id = request_id_var.get("-")
        return True


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
            "request_id": getattr(record, "request_id", "-"),
        }

        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)

        return json.dumps(payload, ensure_ascii=False)


class ColorFormatter(logging.Formatter):
    _RESET = "\x1b[0m"
    _DIM = "\x1b[2m"
    _BOLD = "\x1b[1m"

    _COLORS = {
        "DEBUG": "\x1b[36m",
        "INFO": "\x1b[32m",
        "WARNING": "\x1b[33m",
        "ERROR": "\x1b[31m",
        "CRITICAL": "\x1b[41m\x1b[37m",
    }

    def format(self, record: logging.LogRecord) -> str:
        color = self._COLORS.get(record.levelname, "")
        ts = self.formatTime(record, self.datefmt)
        level = f"{color}{self._BOLD}{record.levelname:<8}{self._RESET}"
        display_logger = "uvicorn" if record.name.startswith("uvicorn") else record.name
        logger_name = f"{self._DIM}{display_logger}{self._RESET}"
        request_id = getattr(record, "request_id", "-")
        message = record.getMessage()

        base = f"{self._DIM}{ts}{self._RESET} {level} {logger_name} {self._DIM}[{request_id}]{self._RESET} {message}"
        if record.exc_info:
            base = f"{base}\n{self.formatException(record.exc_info)}"
        return base


class PlainFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        ts = self.formatTime(record, self.datefmt)
        display_logger = "uvicorn" if record.name.startswith("uvicorn") else record.name
        request_id = getattr(record, "request_id", "-")
        message = record.getMessage()

        base = f"{ts} {record.levelname} {display_logger} [{request_id}] {message}"
        if record.exc_info:
            base = f"{base}\n{self.formatException(record.exc_info)}"
        return base


class SuppressReloadNoiseFilter(logging.Filter):
    _pattern = re.compile(r"asyncio\.exceptions\.CancelledError|KeyboardInterrupt")

    def filter(self, record: logging.LogRecord) -> bool:  # noqa: A003
        if not record.name.startswith("uvicorn"):
            return True

        # Case 1: uvicorn attaches the exception via exc_info.
        if record.exc_info:
            try:
                formatted = logging.Formatter().formatException(record.exc_info)
            except Exception:
                return True
            return not bool(self._pattern.search(formatted))

        # Case 2: uvicorn logs a traceback as plain text (message only).
        msg = record.getMessage()
        if "Traceback (most recent call last):" in msg and self._pattern.search(msg):
            return False

        return True


class SessionLogFileHandler(logging.FileHandler):
    def __init__(self, logs_dir: str, utc: bool = False) -> None:
        self._logs_dir = Path(logs_dir)
        self._archive_root = self._logs_dir / "OLD_logs"
        self._archive_root.mkdir(parents=True, exist_ok=True)
        self._utc = utc

        self._current_path = self._logs_dir / "CURRENT_app.log"
        self._last_path = self._logs_dir / "LAST_app.log"

        # If the previous session ended unexpectedly (or terminal was closed),
        # archive the existing CURRENT_app.log before starting a new session.
        self._archive_current(ts=self._now(), source_path=self._current_path)

        super().__init__(filename=str(self._current_path), mode="w", encoding="utf-8", delay=False)

    def _now(self) -> _dt.datetime:
        return _dt.datetime.utcnow() if self._utc else _dt.datetime.now()

    def _archive_dir(self, ts: _dt.datetime) -> Path:
        year = ts.strftime("%Y")
        month = ts.strftime("%m")
        target_dir = self._archive_root / year / month
        target_dir.mkdir(parents=True, exist_ok=True)
        return target_dir

    def _unique_target(self, ts: _dt.datetime) -> Path:
        base_dir = self._archive_dir(ts)
        stamp = ts.strftime("%Y-%m-%d_%H-%M-%S")
        pid = os.getpid()

        candidate = base_dir / f"{stamp}_{pid}_app.log"
        if not candidate.exists():
            return candidate

        i = 1
        while True:
            candidate = base_dir / f"{stamp}_{pid}_{i}_app.log"
            if not candidate.exists():
                return candidate
            i += 1

    def _archive_current(self, ts: _dt.datetime, source_path: Path) -> None:
        if not source_path.exists() or source_path.stat().st_size == 0:
            return

        target = self._unique_target(ts)
        try:
            os.replace(str(source_path), str(target))
        except OSError:
            shutil.move(str(source_path), str(target))

        self._update_last(archived_path=target)

    def _update_last(self, archived_path: Path) -> None:
        try:
            self._last_path.parent.mkdir(parents=True, exist_ok=True)
            tmp = self._last_path.with_suffix(".tmp")
            shutil.copy2(str(archived_path), str(tmp))
            os.replace(str(tmp), str(self._last_path))
        except Exception:
            # If LAST_app.log cannot be updated (permissions/IO), do not break logging.
            return

    def close(self) -> None:
        # Close the file and then archive it as a completed session log.
        try:
            super().close()
        finally:
            self._archive_current(ts=self._now(), source_path=self._current_path)
            # Keep the CURRENT file present (empty) for tooling that expects it.
            try:
                self._current_path.parent.mkdir(parents=True, exist_ok=True)
                self._current_path.write_text("", encoding="utf-8")
            except Exception:
                pass


_configured = False


def _normalize_level(level: str) -> str:
    normalized = (level or "INFO").strip().upper()
    aliases = {
        "WARN": "WARNING",
        "FATAL": "CRITICAL",
    }
    normalized = aliases.get(normalized, normalized)
    if normalized not in logging._nameToLevel:  # type: ignore[attr-defined]
        return "INFO"
    return normalized


def build_logging_config(*, level: str, logs_dir: Path, json_logs: bool, color: bool) -> dict[str, Any]:
    fmt = "%(asctime)s %(levelname)s %(name)s [%(request_id)s] %(message)s"

    return {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {
            "request_id": {
                "()": "app.core.logging.RequestIdFilter",
            },
            "suppress_reload_noise": {
                "()": "app.core.logging.SuppressReloadNoiseFilter",
            }
        },
        "formatters": {
            "standard": {
                "format": fmt,
            },
            "json": {
                "()": "app.core.logging.JsonFormatter",
            },
            "plain": {
                "()": "app.core.logging.PlainFormatter",
            },
            "color": {
                "()": "app.core.logging.ColorFormatter",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": level,
                "formatter": "json" if json_logs else ("color" if color else "plain"),
                "filters": ["request_id", "suppress_reload_noise"],
            },
            "file": {
                "()": "app.core.logging.SessionLogFileHandler",
                "level": level,
                "formatter": "json" if json_logs else "plain",
                "filters": ["request_id", "suppress_reload_noise"],
                "logs_dir": str(logs_dir),
                "utc": False,
            },
        },
        "root": {
            "level": level,
            "handlers": ["console", "file"],
        },
        "loggers": {
            "uvicorn": {
                "handlers": ["console", "file"],
                "level": level,
                "propagate": False,
            },
            "uvicorn.error": {
                "handlers": ["console", "file"],
                "level": level,
                "propagate": False,
            },
            "uvicorn.access": {
                "handlers": ["console", "file"],
                "level": level,
                "propagate": False,
            },
        },
    }


def init_logging(*, level: str, logs_dir: Path, json_logs: bool, color: bool) -> None:
    global _configured
    if _configured:
        return

    level = _normalize_level(level)

    logs_dir.mkdir(parents=True, exist_ok=True)
    (logs_dir / "OLD_logs").mkdir(parents=True, exist_ok=True)

    config = build_logging_config(level=level, logs_dir=logs_dir, json_logs=json_logs, color=color)
    logging.config.dictConfig(config)

    file_handler = next((h for h in logging.getLogger().handlers if hasattr(h, "flush")), None)
    if file_handler is not None:
        file_handler.flush()

    _configured = True
