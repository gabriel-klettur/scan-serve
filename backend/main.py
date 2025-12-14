from __future__ import annotations

import os

import uvicorn


def main() -> None:
    """Run the FastAPI app via Uvicorn.

    Environment variables:
        - RV_HOST: Host to bind (default: 127.0.0.1)
        - RV_PORT: Port to bind (default: 8000)
        - RV_RELOAD: 1/true/yes enables reload (default: true)
        - RV_LOG_LEVEL: uvicorn log level (default: info)
    """

    host = os.getenv("RV_HOST", "127.0.0.1")
    port = int(os.getenv("RV_PORT", "8000"))
    reload_enabled = os.getenv("RV_RELOAD", "true").lower() in {"1", "true", "yes", "y"}
    log_level = os.getenv("RV_LOG_LEVEL", "info")

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload_enabled,
        log_level=log_level,
        log_config=None,
    )


if __name__ == "__main__":
    main()
