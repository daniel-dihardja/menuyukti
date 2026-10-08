"""Tests for public-holiday visual brief drafting."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import httpx
import pytest
from agents_app.agents.core.holiday_story_draft.models import HolidayInput, StoryDraftResult
from agents_app.agents.core.holiday_visual_brief.draft import (
    LocationNotFoundError,
    draft_holiday_visual_brief,
)
from agents_app.agents.core.holiday_visual_brief.models import (
    StyleAnalysisInput,
    VisualBriefResult,
)
from agents_app.agents.core.holiday_visual_brief.prompts import visual_brief_user_text
from agents_app.agents.core.llm_invoke import LLMInvokeError
from agents_app.server import app
from fastapi.testclient import TestClient

_STYLE = {
    "summary": "Warm editorial",
    "palette": "amber, cream",
    "lighting": "soft side light",
    "medium": "photography",
    "avoid": "neon overlays",
}

_LOC = {
    "name": "Café Test",
    "city": "Jakarta",
    "country": "Indonesia",
    "openingHours": [],
}


def test_visual_brief_result_truncates_overlong_leonardo_prompt() -> None:
    long_prompt = "x" * 2000
    result = VisualBriefResult(
        scene="Sparkling table",
        mood="Celebratory",
        composition="9:16 center subject",
        leonardoPrompt=long_prompt,
    )
    assert len(result.leonardo_prompt) == 1500
    assert result.leonardo_prompt == "x" * 1500


def test_visual_brief_user_text_includes_style_and_caption() -> None:
    text = visual_brief_user_text(
        location_markdown="## Location basics\n- **Name**: Café",
        holiday={"id": "A", "date": "2026-01-01", "name": "New Year"},
        story_caption="Happy New Year!",
        style_analysis=_STYLE,
        operator_instructions="  No text in image.  ",
    )
    assert "Style foundation" in text
    assert "Warm editorial" in text
    assert "Happy New Year!" in text
    assert "Operator visual instructions" in text
    assert "No text in image." in text
    assert "New Year" in text


def test_visual_brief_user_text_includes_previous_and_feedback() -> None:
    text = visual_brief_user_text(
        location_markdown="## Venue\n",
        holiday={"id": "A", "date": "2026-01-01", "name": "New Year"},
        story_caption="Hi",
        style_analysis=_STYLE,
        previous_result={
            "scene": "Table set",
            "mood": "Festive",
            "composition": "Centered 9:16",
            "leonardoPrompt": "warm table scene",
        },
        feedback="  More food focus.  ",
    )
    assert "Previous brief" in text
    assert "Table set" in text
    assert "User feedback" in text
    assert "More food focus." in text
    assert "Revise the previous" in text


@pytest.mark.asyncio
async def test_draft_holiday_visual_brief_missing_location() -> None:
    client = AsyncMock(spec=httpx.AsyncClient)
    with (
        patch(
            "agents_app.agents.core.holiday_visual_brief.draft.graphql_post",
            new=AsyncMock(return_value={"location": None}),
        ),
        pytest.raises(LocationNotFoundError),
    ):
        await draft_holiday_visual_brief(
            client=client,
            user_id="user_1",
            location_id=99,
            holiday=HolidayInput(id="A", date="2026-01-01", name="New Year"),
            story_draft=StoryDraftResult(caption="Happy NY"),
            style_analysis=StyleAnalysisInput.model_validate(_STYLE),
        )


@pytest.mark.asyncio
async def test_draft_holiday_visual_brief_merges_llm_result() -> None:
    client = AsyncMock(spec=httpx.AsyncClient)
    holiday = HolidayInput(id="A", date="2026-01-01", name="New Year")
    expected = VisualBriefResult(
        scene="Sparkling table",
        mood="Celebratory",
        composition="9:16 center subject",
        leonardoPrompt="warm festive restaurant table, soft light, 9:16",
    )
    with (
        patch(
            "agents_app.agents.core.holiday_visual_brief.draft.graphql_post",
            new=AsyncMock(return_value={"location": _LOC}),
        ),
        patch(
            "agents_app.agents.core.holiday_visual_brief.draft.structured_ainvoke_with_retry",
            new=AsyncMock(return_value=expected),
        ),
        patch(
            "agents_app.agents.core.holiday_visual_brief.draft.record_ai_usage_event",
            new=AsyncMock(),
        ),
    ):
        item = await draft_holiday_visual_brief(
            client=client,
            user_id="user_1",
            location_id=1,
            holiday=holiday,
            story_draft=StoryDraftResult(caption="Happy New Year!"),
            style_analysis=StyleAnalysisInput.model_validate(_STYLE),
            reporting_user="user_1",
        )
    assert item.id == "A"
    assert item.result.scene == "Sparkling table"
    assert item.result.leonardo_prompt.startswith("warm festive")


@pytest.mark.asyncio
async def test_draft_holiday_visual_brief_propagates_llm_error() -> None:
    client = AsyncMock(spec=httpx.AsyncClient)
    with (
        patch(
            "agents_app.agents.core.holiday_visual_brief.draft.graphql_post",
            new=AsyncMock(return_value={"location": _LOC}),
        ),
        patch(
            "agents_app.agents.core.holiday_visual_brief.draft.structured_ainvoke_with_retry",
            new=AsyncMock(side_effect=LLMInvokeError("fail", code="LLM_UPSTREAM")),
        ),
        pytest.raises(LLMInvokeError),
    ):
        await draft_holiday_visual_brief(
            client=client,
            user_id="user_1",
            location_id=1,
            holiday=HolidayInput(id="A", date="2026-01-01", name="New Year"),
            story_draft=StoryDraftResult(caption="Hi"),
            style_analysis=StyleAnalysisInput.model_validate(_STYLE),
        )


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def test_visual_brief_endpoint_requires_user(client: TestClient) -> None:
    res = client.post(
        "/playbooks/public-holidays/visual-brief",
        json={
            "locationId": 1,
            "holiday": {"id": "A", "date": "2026-01-01", "name": "New Year"},
            "storyDraft": {"caption": "Hi"},
            "styleAnalysis": _STYLE,
        },
    )
    assert res.status_code == 401


def test_visual_brief_endpoint_rejects_partial_revision(client: TestClient) -> None:
    res = client.post(
        "/playbooks/public-holidays/visual-brief",
        headers={"X-Menuyukti-User-Id": "user_1"},
        json={
            "locationId": 1,
            "holiday": {"id": "A", "date": "2026-01-01", "name": "New Year"},
            "storyDraft": {"caption": "Hi"},
            "styleAnalysis": _STYLE,
            "previousResult": {
                "scene": "A",
                "mood": "B",
                "composition": "C",
                "leonardoPrompt": "D",
            },
        },
    )
    assert res.status_code == 422


def test_visual_brief_endpoint_ok(client: TestClient) -> None:
    from agents_app.agents.core.holiday_visual_brief.models import VisualBriefItem

    expected = VisualBriefItem(
        id="A",
        date="2026-01-01",
        name="New Year",
        result=VisualBriefResult(
            scene="Sparkling table",
            mood="Celebratory",
            composition="9:16",
            leonardoPrompt="warm festive table",
        ),
    )
    with patch(
        "agents_app.routers.holiday_visual_brief.draft_holiday_visual_brief",
        new=AsyncMock(return_value=expected),
    ):
        res = client.post(
            "/playbooks/public-holidays/visual-brief",
            headers={"X-Menuyukti-User-Id": "user_1"},
            json={
                "locationId": 1,
                "holiday": {"id": "A", "date": "2026-01-01", "name": "New Year"},
                "storyDraft": {"caption": "Happy NY"},
                "styleAnalysis": _STYLE,
            },
        )
    assert res.status_code == 200
    body = res.json()
    assert body["result"]["leonardoPrompt"] == "warm festive table"
