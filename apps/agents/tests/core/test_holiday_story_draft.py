"""Tests for public-holiday Instagram story drafting."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import httpx
import pytest
from agents_app.agents.core.holiday_story_draft.draft import (
    LocationNotFoundError,
    draft_holiday_story,
)
from agents_app.agents.core.holiday_story_draft.models import (
    HolidayInput,
    StoryDraftItem,
    StoryDraftResult,
)
from agents_app.agents.core.holiday_story_draft.prompts import story_draft_user_text
from agents_app.agents.core.llm_invoke import LLMInvokeError
from agents_app.server import app
from fastapi.testclient import TestClient


def test_story_draft_user_text_includes_operator_instructions() -> None:
    text = story_draft_user_text(
        location_markdown="## Location basics\n- **Name**: Café",
        holiday={"id": "A", "date": "2026-01-01", "name": "New Year"},
        operator_instructions="  Warm tone; keep under 80 chars.  ",
    )
    assert "Operator story instructions" in text
    assert "Warm tone; keep under 80 chars." in text
    assert "New Year" in text
    assert "Café" in text


def test_story_draft_user_text_omits_empty_instructions() -> None:
    text = story_draft_user_text(
        location_markdown="## Venue\n",
        holiday={"id": "A", "date": "2026-01-01", "name": "New Year"},
        operator_instructions="   ",
    )
    assert "Operator story instructions" not in text


def test_story_draft_user_text_includes_previous_and_feedback() -> None:
    text = story_draft_user_text(
        location_markdown="## Venue\n",
        holiday={"id": "A", "date": "2026-01-01", "name": "New Year"},
        previous_result={
            "caption": "Happy New Year!",
            "visualBrief": "Gold confetti",
        },
        feedback="  Make it shorter.  ",
    )
    assert "Previous draft" in text
    assert "Happy New Year!" in text
    assert "User feedback" in text
    assert "Make it shorter." in text
    assert "Revise the previous" in text


def test_story_draft_user_text_omits_revision_when_feedback_empty() -> None:
    text = story_draft_user_text(
        location_markdown="## Venue\n",
        holiday={"id": "A", "date": "2026-01-01", "name": "New Year"},
        previous_result={"caption": "Hi", "visualBrief": "Brief"},
        feedback="   ",
    )
    assert "Previous draft" not in text
    assert "Draft one Instagram story" in text


@pytest.mark.asyncio
async def test_draft_holiday_story_missing_location() -> None:
    client = AsyncMock(spec=httpx.AsyncClient)
    with (
        patch(
            "agents_app.agents.core.holiday_story_draft.draft.graphql_post",
            new=AsyncMock(return_value={"location": None}),
        ),
        pytest.raises(LocationNotFoundError),
    ):
        await draft_holiday_story(
            client=client,
            user_id="user_1",
            location_id=99,
            holiday=HolidayInput(id="A", date="2026-01-01", name="New Year"),
        )


@pytest.mark.asyncio
async def test_draft_holiday_story_merges_llm_result() -> None:
    client = AsyncMock(spec=httpx.AsyncClient)
    holiday = HolidayInput(id="A", date="2026-01-01", name="New Year")
    llm_result = StoryDraftResult(
        caption="Happy New Year from Café!",
        visualBrief="Warm gold overlay, fireworks soft-focus behind logo",
    )

    with (
        patch(
            "agents_app.agents.core.holiday_story_draft.draft.graphql_post",
            new=AsyncMock(
                return_value={
                    "location": {
                        "name": "Café Test",
                        "city": "Jakarta",
                        "country": "Indonesia",
                        "openingHours": [],
                    }
                }
            ),
        ),
        patch(
            "agents_app.agents.core.holiday_story_draft.draft.structured_ainvoke_with_retry",
            new=AsyncMock(return_value=llm_result),
        ),
        patch(
            "agents_app.agents.core.holiday_story_draft.draft.record_ai_usage_event",
            new=AsyncMock(),
        ),
        patch(
            "agents_app.agents.core.holiday_story_draft.draft.get_llm_structured",
            return_value=object(),
        ),
    ):
        item = await draft_holiday_story(
            client=client,
            user_id="user_1",
            location_id=1,
            holiday=holiday,
            reporting_user="user_1",
            operator_instructions="Warm tone",
        )

    assert item == StoryDraftItem(
        id="A",
        date="2026-01-01",
        name="New Year",
        result=llm_result,
    )


@pytest.mark.asyncio
async def test_draft_holiday_story_passes_revision_into_prompt() -> None:
    client = AsyncMock(spec=httpx.AsyncClient)
    holiday = HolidayInput(id="A", date="2026-01-01", name="New Year")
    previous = StoryDraftResult(caption="Old caption", visualBrief="Old brief")
    llm_result = StoryDraftResult(caption="New caption", visualBrief="New brief")

    with (
        patch(
            "agents_app.agents.core.holiday_story_draft.draft.graphql_post",
            new=AsyncMock(
                return_value={
                    "location": {
                        "name": "Café Test",
                        "city": "Jakarta",
                        "country": "Indonesia",
                        "openingHours": [],
                    }
                }
            ),
        ),
        patch(
            "agents_app.agents.core.holiday_story_draft.draft.structured_ainvoke_with_retry",
            new=AsyncMock(return_value=llm_result),
        ) as mock_llm,
        patch(
            "agents_app.agents.core.holiday_story_draft.draft.record_ai_usage_event",
            new=AsyncMock(),
        ),
        patch(
            "agents_app.agents.core.holiday_story_draft.draft.get_llm_structured",
            return_value=object(),
        ),
    ):
        item = await draft_holiday_story(
            client=client,
            user_id="user_1",
            location_id=1,
            holiday=holiday,
            previous_result=previous,
            feedback="Shorter please",
        )

    assert item.result == llm_result
    messages = mock_llm.await_args.args[2]
    human = messages[1].content
    assert "Previous draft" in human
    assert "Old caption" in human
    assert "Shorter please" in human


@pytest.fixture
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def test_draft_story_endpoint_requires_user_header(client: TestClient) -> None:
    response = client.post(
        "/playbooks/public-holidays/draft-story",
        json={
            "locationId": 1,
            "holiday": {"id": "A", "date": "2026-01-01", "name": "New Year"},
        },
    )
    assert response.status_code == 401


def test_draft_story_endpoint_returns_item(client: TestClient) -> None:
    drafted = StoryDraftItem(
        id="A",
        date="2026-01-01",
        name="New Year",
        result=StoryDraftResult(
            caption="Happy New Year!",
            visualBrief="Gold confetti, logo bottom-left",
        ),
    )
    with patch(
        "agents_app.routers.holiday_story_draft.draft_holiday_story",
        new=AsyncMock(return_value=drafted),
    ):
        response = client.post(
            "/playbooks/public-holidays/draft-story",
            headers={"X-Menuyukti-User-Id": "user_1"},
            json={
                "locationId": 7,
                "holiday": {"id": "A", "date": "2026-01-01", "name": "New Year"},
                "instructions": "Warm tone",
            },
        )
    assert response.status_code == 200
    assert response.json() == {
        "id": "A",
        "date": "2026-01-01",
        "name": "New Year",
        "result": {
            "caption": "Happy New Year!",
            "visualBrief": "Gold confetti, logo bottom-left",
        },
    }


def test_draft_story_endpoint_maps_location_not_found(client: TestClient) -> None:
    with patch(
        "agents_app.routers.holiday_story_draft.draft_holiday_story",
        new=AsyncMock(side_effect=LocationNotFoundError("Location not found or access denied")),
    ):
        response = client.post(
            "/playbooks/public-holidays/draft-story",
            headers={"X-Menuyukti-User-Id": "user_1"},
            json={
                "locationId": 7,
                "holiday": {"id": "A", "date": "2026-01-01", "name": "New Year"},
            },
        )
    assert response.status_code == 404


def test_draft_story_endpoint_maps_llm_error(client: TestClient) -> None:
    with patch(
        "agents_app.routers.holiday_story_draft.draft_holiday_story",
        new=AsyncMock(side_effect=LLMInvokeError("LLM_UPSTREAM: boom", code="LLM_UPSTREAM")),
    ):
        response = client.post(
            "/playbooks/public-holidays/draft-story",
            headers={"X-Menuyukti-User-Id": "user_1"},
            json={
                "locationId": 7,
                "holiday": {"id": "A", "date": "2026-01-01", "name": "New Year"},
            },
        )
    assert response.status_code == 502


def test_draft_story_endpoint_rejects_partial_revision(client: TestClient) -> None:
    response = client.post(
        "/playbooks/public-holidays/draft-story",
        headers={"X-Menuyukti-User-Id": "user_1"},
        json={
            "locationId": 7,
            "holiday": {"id": "A", "date": "2026-01-01", "name": "New Year"},
            "feedback": "Make it shorter",
        },
    )
    assert response.status_code == 422


def test_draft_story_endpoint_revise_happy_path(client: TestClient) -> None:
    drafted = StoryDraftItem(
        id="A",
        date="2026-01-01",
        name="New Year",
        result=StoryDraftResult(
            caption="Revised caption",
            visualBrief="Revised brief",
        ),
    )
    with patch(
        "agents_app.routers.holiday_story_draft.draft_holiday_story",
        new=AsyncMock(return_value=drafted),
    ) as mock_draft:
        response = client.post(
            "/playbooks/public-holidays/draft-story",
            headers={"X-Menuyukti-User-Id": "user_1"},
            json={
                "locationId": 7,
                "holiday": {"id": "A", "date": "2026-01-01", "name": "New Year"},
                "previousResult": {
                    "caption": "Old caption",
                    "visualBrief": "Old brief",
                },
                "feedback": "Make it warmer",
            },
        )
    assert response.status_code == 200
    assert response.json()["result"]["caption"] == "Revised caption"
    mock_draft.assert_awaited_once()
    kwargs = mock_draft.await_args.kwargs
    assert kwargs["feedback"] == "Make it warmer"
    assert kwargs["previous_result"] is not None
    assert kwargs["previous_result"].caption == "Old caption"
