"""Tests for core Markdown formatting and HTTP endpoint."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.format_markdown import UnknownPresetError, format_markdown
from agents_app.server import app
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


@pytest.mark.asyncio
async def test_format_markdown_unknown_preset_raises() -> None:
    with pytest.raises(UnknownPresetError):
        await format_markdown(content="hello", preset="not-a-real-preset")


@pytest.mark.asyncio
@patch("agents_app.agents.core.format_markdown.format.ainvoke_with_retry", new_callable=AsyncMock)
@patch("agents_app.agents.core.format_markdown.format.get_llm_structured")
async def test_format_markdown_invokes_llm(
    mock_get_llm: MagicMock,
    mock_ainvoke: AsyncMock,
) -> None:
    mock_llm = MagicMock()
    mock_get_llm.return_value = mock_llm
    mock_ainvoke.return_value = AIMessage(content="## Formatted\n")

    out = await format_markdown(content="raw", preset="milestone-data")
    assert out == "## Formatted"
    mock_ainvoke.assert_awaited_once()
    assert mock_ainvoke.await_args.args[0] is mock_llm


@patch("agents_app.routers.format_markdown.format_markdown", new_callable=AsyncMock)
def test_format_markdown_http_llm_error(mock_fmt: AsyncMock, client: TestClient) -> None:
    from agents_app.agents.core.llm_invoke import LLMInvokeError

    mock_fmt.side_effect = LLMInvokeError("LLM_UPSTREAM: boom", code="LLM_UPSTREAM", retryable=True)
    response = client.post(
        "/format-markdown",
        json={"content": "x", "preset": "milestone-data"},
    )
    assert response.status_code == 502
    assert "LLM_UPSTREAM" in response.json()["detail"]


@patch("agents_app.routers.format_markdown.format_markdown", new_callable=AsyncMock)
def test_format_markdown_http_success(mock_fmt: AsyncMock, client: TestClient) -> None:
    mock_fmt.return_value = "# Done"
    response = client.post(
        "/format-markdown",
        json={"content": "x", "preset": "milestone-data"},
    )
    assert response.status_code == 200
    assert response.json() == {"formatted": "# Done"}


def test_format_markdown_http_unknown_preset(client: TestClient) -> None:
    response = client.post(
        "/format-markdown",
        json={"content": "x", "preset": "unknown-preset-id"},
    )
    assert response.status_code == 400
