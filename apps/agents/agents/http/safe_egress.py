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
