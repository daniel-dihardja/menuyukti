"""Tests for public-holiday style foundation analysis."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import httpx
import pytest
from agents_app.agents.core.holiday_style_analysis.analyze import analyze_holiday_style
from agents_app.agents.core.holiday_style_analysis.models import StyleAnalysisResult
from agents_app.agents.core.holiday_style_analysis.prompts import style_analysis_user_text
from agents_app.agents.core.llm_invoke import LLMInvokeError
from agents_app.server import app
from fastapi.testclient import TestClient


def test_style_analysis_user_text_includes_operator_instructions() -> None:
    text = style_analysis_user_text(operator_instructions="  Warm tones only.  ")
    assert "Operator art-direction notes" in text
    assert "Warm tones only." in text


def test_style_analysis_user_text_omits_empty_instructions() -> None:
    text = style_analysis_user_text(operator_instructions="   ")
    assert "Operator art-direction notes" not in text


@pytest.mark.asyncio
async def test_analyze_holiday_style_returns_structured_result() -> None:
    expected = StyleAnalysisResult(
        summary="Warm editorial food photography",
        palette="amber, cream, soft greens",
        lighting="Soft side light",
        medium="Natural light photography",
        avoid="Harsh flash, neon overlays",
    )
    with (
        patch(
            "agents_app.agents.core.holiday_style_analysis.analyze._structured_ainvoke_function_calling",
            new=AsyncMock(return_value=expected),
        ),
        patch(
            "agents_app.agents.core.holiday_style_analysis.analyze.record_ai_usage_event",
            new=AsyncMock(),
        ),
    ):
        result = await analyze_holiday_style(
            image_url="data:image/png;base64,aaa",
            reporting_user="user_1",
            client=AsyncMock(spec=httpx.AsyncClient),
        )
    assert result.summary == expected.summary
    assert result.palette == expected.palette


@pytest.mark.asyncio
async def test_analyze_holiday_style_propagates_llm_error() -> None:
    with (
        patch(
            "agents_app.agents.core.holiday_style_analysis.analyze._structured_ainvoke_function_calling",
            new=AsyncMock(side_effect=LLMInvokeError("fail", code="LLM_UPSTREAM")),
        ),
        pytest.raises(LLMInvokeError),
    ):
        await analyze_holiday_style(image_url="data:image/png;base64,aaa")


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def test_analyze_style_endpoint_requires_user(client: TestClient) -> None:
    res = client.post(
        "/playbooks/public-holidays/analyze-style",
        json={"imageUrl": "data:image/png;base64,aaa"},
    )
    assert res.status_code == 401


def test_analyze_style_endpoint_rejects_bad_url(client: TestClient) -> None:
    res = client.post(
        "/playbooks/public-holidays/analyze-style",
        headers={"X-Menuyukti-User-Id": "user_1"},
        json={"imageUrl": "ftp://example.com/x.png"},
    )
    assert res.status_code == 400


def test_analyze_style_endpoint_ok(client: TestClient) -> None:
    expected = StyleAnalysisResult(
        summary="Warm editorial",
        palette="amber",
        lighting="soft",
        medium="photo",
        avoid="neon",
    )
    with patch(
        "agents_app.routers.holiday_style_analysis.analyze_holiday_style",
        new=AsyncMock(return_value=expected),
    ):
        res = client.post(
            "/playbooks/public-holidays/analyze-style",
            headers={"X-Menuyukti-User-Id": "user_1"},
            json={"imageUrl": "data:image/png;base64,aaa", "instructions": "keep warm"},
        )
    assert res.status_code == 200
    body = res.json()
    assert body["summary"] == "Warm editorial"
    assert body["palette"] == "amber"
