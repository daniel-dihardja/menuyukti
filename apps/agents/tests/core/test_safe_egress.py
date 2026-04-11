"""safe_https_get and adapter_http_get egress helpers."""

import httpx
import pytest
from agents_app.agents.http.safe_egress import adapter_http_get, safe_https_get


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


@pytest.mark.asyncio
async def test_adapter_http_get_http_rejects_without_dev_flag(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("MENUYUKTI_ADAPTER_DEV_HTTP_LOCALHOST", raising=False)
    body, err = await adapter_http_get("http://127.0.0.1:3090/api/mock")
    assert body is None
    assert err is not None
    assert "DEV_HTTP" in err or "localhost" in err.lower()


@pytest.mark.asyncio
async def test_adapter_http_get_dev_localhost_ok(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MENUYUKTI_ADAPTER_DEV_HTTP_LOCALHOST", "1")

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.host == "127.0.0.1"
        assert request.url.port == 3090
        return httpx.Response(200, content=b'{"promotions":[]}')

    transport = httpx.MockTransport(handler)

    def loopback_client() -> httpx.AsyncClient:
        return httpx.AsyncClient(
            transport=transport,
            timeout=httpx.Timeout(30.0),
            follow_redirects=False,
            trust_env=False,
        )

    monkeypatch.setattr(
        "agents_app.agents.http.safe_egress._dev_loopback_httpx_client",
        loopback_client,
    )

    body, err = await adapter_http_get("http://127.0.0.1:3090/api/mock", client=None)
    assert err is None
    assert body == '{"promotions":[]}'


@pytest.mark.asyncio
async def test_adapter_http_get_dev_localhost_rejects_wrong_port(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MENUYUKTI_ADAPTER_DEV_HTTP_LOCALHOST", "1")
    body, err = await adapter_http_get("http://127.0.0.1:8080/")
    assert body is None
    assert err is not None
    assert "allowlist" in err.lower()


@pytest.mark.asyncio
async def test_adapter_http_get_delegates_https_to_safe_path(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("MENUYUKTI_ADAPTER_DEV_HTTP_LOCALHOST", raising=False)
    body, err = await adapter_http_get("https://127.0.0.1/")
    assert body is None
    assert err is not None
