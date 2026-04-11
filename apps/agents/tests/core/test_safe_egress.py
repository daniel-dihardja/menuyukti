"""safe_https_get egress wrapper."""

import httpx
import pytest
from agents_app.agents.http.safe_egress import safe_https_get


@pytest.mark.asyncio
async def test_safe_https_get_rejects_loopback_literal():
    body, err = await safe_https_get("https://127.0.0.1/")
    assert body is None
    assert err is not None
    assert "private" in err.lower() or "loopback" in err.lower()


@pytest.mark.asyncio
async def test_safe_https_get_mock_public_ip_200():
    def handler(request: httpx.Request) -> httpx.Response:
        assert str(request.url).startswith("https://8.8.8.8/")
        return httpx.Response(200, content=b'{"ok":true}')

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        body, err = await safe_https_get("https://8.8.8.8/x", client=client)
    assert err is None
    assert body == '{"ok":true}'


@pytest.mark.asyncio
async def test_safe_https_get_redirect_to_private_rejected():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/a":
            return httpx.Response(302, headers={"Location": "https://127.0.0.1/b"})
        return httpx.Response(200, content=b"unexpected")

    transport = httpx.MockTransport(handler)
    async with httpx.AsyncClient(transport=transport) as client:
        body, err = await safe_https_get("https://8.8.8.8/a", client=client)
    assert body is None
    assert err is not None
    assert "private" in err.lower() or "loopback" in err.lower()
