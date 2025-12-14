from __future__ import annotations

import time
import uuid

from fastapi import FastAPI, Request, Response

from app.core.logging import request_id_var


def add_request_logging(app: FastAPI) -> None:
    @app.middleware("http")
    async def _request_logging(request: Request, call_next):
        rid = request.headers.get("x-request-id") or uuid.uuid4().hex
        token = request_id_var.set(rid)
        started = time.perf_counter()
        logger = getattr(request.app.state, "logger", None)
        client_ip = request.client.host if request.client else "-"

        try:
            response: Response = await call_next(request)
        except Exception as exc:
            elapsed_ms = (time.perf_counter() - started) * 1000.0
            if logger is not None:
                logger.exception(
                    "request_failed method=%s path=%s client_ip=%s duration_ms=%.2f",
                    request.method,
                    request.url.path,
                    client_ip,
                    elapsed_ms,
                )
            request_id_var.reset(token)
            raise

        elapsed_ms = (time.perf_counter() - started) * 1000.0
        response.headers["x-request-id"] = rid

        if request.url.path not in {"/health"}:
            if logger is not None:
                logger.info(
                    "request_completed method=%s path=%s status=%s client_ip=%s duration_ms=%.2f",
                    request.method,
                    request.url.path,
                    response.status_code,
                    client_ip,
                    elapsed_ms,
                )

        request_id_var.reset(token)
        return response
