from __future__ import annotations

import os
import socket

import uvicorn


def _parse_int_env(var_name: str, default: int) -> int:
    """Parse an integer environment variable with a safe default.

    Falls back to *default* and prints a short note if the value is invalid.
    """

    value = os.getenv(var_name)
    if value is None:
        return default

    try:
        return int(value)
    except ValueError:
        print(f"[startup] Invalid value for {var_name!r}: {value!r}. Using {default}.")
        return default


def _is_port_available(host: str, port: int) -> bool:
    """Return True if *port* looks free on *host*.

    Uses a short-lived server socket bind to probe availability.
    """

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))
        except OSError:
            return False
    return True


def _find_available_port(host: str, base_port: int, max_attempts: int) -> int:
    """Find an available port starting at *base_port*.

    Tries up to *max_attempts* consecutive ports. If *max_attempts* is 1,
    this is equivalent to "use this exact port or fail".
    """

    attempts = max(1, max_attempts)
    for offset in range(attempts):
        candidate = base_port + offset
        if _is_port_available(host, candidate):
            if offset > 0:
                print(
                    f"[startup] Port {base_port} is busy on {host}; "
                    f"using {candidate} instead."
                )
            return candidate

    raise RuntimeError(
        f"No free port found on host {host!r} starting at {base_port} "
        f"within {attempts} attempts."
    )


def _get_local_ip_addresses() -> list[str]:
    """Best-effort discovery of local IPv4 addresses (non-loopback).

    This is used purely for printing friendly "how to reach me" URLs.
    """

    addresses: set[str] = set()

    # Try resolving the hostname to addresses.
    try:
        hostname = socket.gethostname()
        host_ips = socket.gethostbyname_ex(hostname)[2]
        for ip in host_ips:
            if not ip.startswith("127."):
                addresses.add(ip)
    except OSError:
        pass

    # Fallback: derive the primary outbound IP without sending data.
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            if not ip.startswith("127."):
                addresses.add(ip)
    except OSError:
        pass

    return sorted(addresses)


def _print_server_banner(host: str, port: int, reload_enabled: bool, log_level: str) -> None:
    """Print a small startup banner with useful access URLs."""

    bind_all = host in {"0.0.0.0", "::", "[::]"}

    print()
    print("=" * 72)
    print(f"Backend server starting on {host}:{port}")
    print(f"  reload={reload_enabled}  log_level={log_level}")
    print()
    print("Accessible URLs:")

    urls: list[str] = []

    # Base URL for the bound host itself.
    display_host = f"[{host}]" if ":" in host and not host.startswith("[") else host
    urls.append(f"http://{display_host}:{port}")

    if bind_all:
        # When bound to all interfaces, localhost is also valid.
        urls.append(f"http://127.0.0.1:{port}")
        urls.append(f"http://localhost:{port}")

        for ip in _get_local_ip_addresses():
            urls.append(f"http://{ip}:{port}")
    elif host in {"127.0.0.1", "localhost"}:
        # Provide both common localhost forms.
        if host != "127.0.0.1":
            urls.append(f"http://127.0.0.1:{port}")
        if host != "localhost":
            urls.append(f"http://localhost:{port}")

    seen: set[str] = set()
    for url in urls:
        if url in seen:
            continue
        print(f"  - {url}")
        seen.add(url)

    if bind_all:
        print()
        print(
            "The server is bound to 0.0.0.0/:: and should be reachable "
            "from other devices on your local network using the LAN URLs above."
        )

    print("=" * 72)
    print()


def main() -> None:
    """Run the FastAPI app via Uvicorn.

    Environment variables:
        - RV_HOST: Host to bind (default: 0.0.0.0)
        - RV_PORT: Port to bind (default: 8000)
        - RV_PORT_SEARCH_MAX: How many consecutive ports to try (default: 1)
        - RV_RELOAD: 1/true/yes enables reload (default: true)
        - RV_LOG_LEVEL: uvicorn log level (default: info)
    """

    host = os.getenv("RV_HOST", "0.0.0.0")
    base_port = _parse_int_env("PORT", 0) or _parse_int_env("RV_PORT", 8000)
    max_port_attempts = _parse_int_env("RV_PORT_SEARCH_MAX", 1)
    reload_enabled = os.getenv("RV_RELOAD", "false").lower() in {"1", "true", "yes", "y"}
    log_level = os.getenv("RV_LOG_LEVEL", "info")

    try:
        port = _find_available_port(host, base_port, max_port_attempts)
    except RuntimeError as exc:
        print(f"[startup] {exc}")
        print(
            "[startup] Tip: adjust RV_PORT or RV_PORT_SEARCH_MAX, or stop the "
            "process currently using the port."
        )
        raise SystemExit(1) from exc

    _print_server_banner(host, port, reload_enabled, log_level)

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
