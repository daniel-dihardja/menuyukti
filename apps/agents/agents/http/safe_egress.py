"""Bounded HTTPS GET with URL validation, DNS checks, and redirect re-validation."""

from __future__ import annotations

import asyncio
import os
from urllib.parse import urljoin, urlparse

import httpx
from url_safety.egress import (
    assert_all_ips_are_public,
    host_is_literal_ip,
    parse_and_validate_egress_https_url,
    resolve_hostname_ips,
)

_DEV_LOCALHOST_FLAG = "MENUYUKTI_ADAPTER_DEV_HTTP_LOCALHOST"
_DEV_LOCALHOST_PORTS = "MENUYUKTI_ADAPTER_DEV_HTTP_PORTS"
_DEV_HTTP_EXTRA_HOSTS = "MENUYUKTI_ADAPTER_DEV_HTTP_EXTRA_HOSTS"

# Hostnames allowed for dev HTTP adapter GET when the dev flag is set (loopback + Docker Desktop host).
_DEFAULT_DEV_HTTP_HOSTS = frozenset(
    {
        "localhost",
        "127.0.0.1",
        "::1",
        "host.docker.internal",
    }
)


def _dev_localhost_enabled() -> bool:
    return os.environ.get(_DEV_LOCALHOST_FLAG, "").strip() in ("1", "true", "True", "yes", "YES")


def _dev_localhost_allowed_ports() -> set[int]:
    raw = os.environ.get(_DEV_LOCALHOST_PORTS, "3090").strip()
    if not raw:
        return {3090}
    ports: set[int] = set()
    for part in raw.split(","):
        p = part.strip()
        if not p:
            continue
        try:
            ports.add(int(p, 10))
        except ValueError:
            continue
    return ports or {3090}


def _dev_allowed_http_hosts() -> frozenset[str]:
    extra_raw = os.environ.get(_DEV_HTTP_EXTRA_HOSTS, "").strip()
    if not extra_raw:
        return _DEFAULT_DEV_HTTP_HOSTS
    more = {h.strip().lower() for h in extra_raw.split(",") if h.strip()}
    return frozenset(_DEFAULT_DEV_HTTP_HOSTS | more)


def _dev_loopback_httpx_client() -> httpx.AsyncClient:
    """Client for dev-only adapter HTTP — ``trust_env=False`` so HTTP(S)_PROXY cannot break localhost."""
    return httpx.AsyncClient(
        timeout=_timeout(),
        follow_redirects=False,
        trust_env=False,
    )


def _validate_dev_localhost_http_url(url: str) -> str | None:
    """Return error message or None if ``url`` is allowed HTTP to loopback for local dev."""
    if not _dev_localhost_enabled():
        return (
            "HTTP adapter URLs require MENUYUKTI_ADAPTER_DEV_HTTP_LOCALHOST=1 for local development"
        )
    u = url.strip()
    parsed = urlparse(u)
    if parsed.scheme.lower() != "http":
        return "URL must use http for this dev-only path"
    if parsed.username is not None or parsed.password is not None:
        return "URL must not contain a username or password"
    host = parsed.hostname
    if not host:
        return "URL must include a valid host"
    host_lower = host.lower().rstrip(".")
    allowed = _dev_allowed_http_hosts()
    if host_lower not in allowed:
        return (
            "Dev HTTP adapter URL host is not allowlisted (allowed: "
            f"{', '.join(sorted(allowed))}; set {_DEV_HTTP_EXTRA_HOSTS} for more)"
        )
    port = parsed.port
    if port is None:
        port = 80
    allowed_ports = _dev_localhost_allowed_ports()
    if port not in allowed_ports:
        return f"Port {port} is not in MENUYUKTI_ADAPTER_DEV_HTTP_PORTS allowlist ({sorted(allowed_ports)})"
    return None


async def dev_localhost_http_get(
    url: str,
    *,
    client: httpx.AsyncClient | None = None,
) -> tuple[str | None, str | None]:
    """Bounded HTTP GET for dev adapter URLs when ``MENUYUKTI_ADAPTER_DEV_HTTP_LOCALHOST`` is set.

    Uses :func:`_dev_loopback_httpx_client` only (``trust_env=False``; ignores ``client``) so proxies
    cannot break loopback/Docker host targets. No redirects; same body size cap as :func:`safe_https_get`.
    """
    _ = client
    err = _validate_dev_localhost_http_url(url)
    if err:
        return None, err

    max_bytes = _max_response_bytes()
    async with _dev_loopback_httpx_client() as http_client:
        try:
            async with http_client.stream("GET", url.strip(), follow_redirects=False) as response:
                if response.status_code < 200 or response.status_code >= 300:
                    return None, f"HTTP {response.status_code}"

                total = 0
                chunks: list[bytes] = []
                async for chunk in response.aiter_bytes():
                    total += len(chunk)
                    if total > max_bytes:
                        return None, f"Response exceeds maximum size ({max_bytes} bytes)"
                    chunks.append(chunk)

                body = b"".join(chunks)
                return body.decode("utf-8", errors="replace"), None
        except OSError as e:
            return None, f"Connection failed: {e}"
        except httpx.RequestError as e:
            return None, f"Request failed: {e}"


async def adapter_http_get(
    url: str,
    *,
    client: httpx.AsyncClient | None = None,
) -> tuple[str | None, str | None]:
    """GET for workspace API adapter tools: HTTPS via :func:`safe_https_get`, or dev-only loopback HTTP."""
    u = url.strip()
    scheme = urlparse(u).scheme.lower()
    if scheme == "https":
        return await safe_https_get(u, client=client)
    if scheme == "http":
        return await dev_localhost_http_get(u, client=client)
    return None, "URL must use http or https"


def _timeout() -> httpx.Timeout:
    total = float(os.environ.get("MENUYUKTI_ADAPTER_HTTP_TIMEOUT_S", "15"))
    capped = min(max(total, 1.0), 120.0)
    return httpx.Timeout(capped, connect=min(10.0, capped))


def _max_response_bytes() -> int:
    raw = int(os.environ.get("MENUYUKTI_ADAPTER_HTTP_MAX_BYTES", str(512 * 1024)))
    return min(max(raw, 1024), 8 * 1024 * 1024)


def _max_redirects() -> int:
    raw = int(os.environ.get("MENUYUKTI_ADAPTER_HTTP_MAX_REDIRECTS", "5"))
    return min(max(raw, 0), 20)


async def _ensure_resolved_host_public(hostname: str) -> str | None:
    if host_is_literal_ip(hostname):
        return None
    try:
        ips = await asyncio.to_thread(resolve_hostname_ips, hostname)
        assert_all_ips_are_public(ips)
    except ValueError as e:
        return str(e)
    return None


async def safe_https_get(
    url: str,
    *,
    client: httpx.AsyncClient | None = None,
) -> tuple[str | None, str | None]:
    """GET ``url`` over HTTPS with SSRF-oriented checks.

    Returns ``(body_text, None)`` on success, or ``(None, error_message)`` on failure.
    Redirects are followed manually (``httpx`` ``follow_redirects=False``) so each hop is
    re-validated. Response body is capped by ``MENUYUKTI_ADAPTER_HTTP_MAX_BYTES``.
    """
    own_client = client is None
    if own_client:
        http_client = httpx.AsyncClient(timeout=_timeout(), follow_redirects=False)
    else:
        assert client is not None
        http_client = client

    try:
        try:
            current = parse_and_validate_egress_https_url(url)
        except ValueError as e:
            return None, str(e)

        redirects = 0
        max_red = _max_redirects()
        max_bytes = _max_response_bytes()

        while True:
            parsed = urlparse(current)
            host = parsed.hostname
            if not host:
                return None, "URL must include a valid host"

            err = await _ensure_resolved_host_public(host)
            if err:
                return None, err

            async with http_client.stream("GET", current) as response:
                if response.status_code in (301, 302, 303, 307, 308):
                    if redirects >= max_red:
                        return None, "Too many redirects"
                    loc = response.headers.get("location")
                    if not loc:
                        return None, "Redirect without Location header"
                    next_url = urljoin(current, loc)
                    try:
                        current = parse_and_validate_egress_https_url(next_url)
                    except ValueError as e:
                        return None, str(e)
                    redirects += 1
                    continue

                if response.status_code < 200 or response.status_code >= 300:
                    return None, f"HTTP {response.status_code}"

                total = 0
                chunks: list[bytes] = []
                async for chunk in response.aiter_bytes():
                    total += len(chunk)
                    if total > max_bytes:
                        return None, f"Response exceeds maximum size ({max_bytes} bytes)"
                    chunks.append(chunk)

                body = b"".join(chunks)
                return body.decode("utf-8", errors="replace"), None
    finally:
        if own_client:
            await http_client.aclose()
