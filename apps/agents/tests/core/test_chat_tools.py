from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from agents_app.agents.core.chat import tools as chat_tools


def _culture_hooks_payload() -> dict:
    return {
        "locationConcept": "Modern Indonesian comfort food",
        "targetAudience": "Young professionals in city center",
        "intersections": [
            {
                "topic": "Ramadan buka puasa moments",
                "conceptLink": "Comfort dishes for group sharing",
                "audienceRelevance": "Fits after-work social dinners",
                "contentExample": "Carousel: best group platter combos",
            },
            {
                "topic": "Rainy season warm meals",
                "conceptLink": "Soup and grilled pairings",
                "audienceRelevance": "Seasonal craving alignment",
                "contentExample": "Reel: kitchen steam shots + plating",
            },
            {
                "topic": "Sunday family gathering",
                "conceptLink": "Bundle menu for 4-6 people",
                "audienceRelevance": "Weekend planning use case",
                "contentExample": "Static post: bundle and reservation CTA",
            },
        ],
        "guardrailCheck": "No politics, no insensitive or divisive framing.",
    }


@pytest.mark.asyncio
async def test_update_milestone_preset_data_replace_success(monkeypatch: pytest.MonkeyPatch) -> None:
    node = {
        "id": "42",
        "nodeType": "milestone",
        "locationId": 7,
        "data": {"presetId": "culture_hooks"},
        "milestonePresetData": _culture_hooks_payload(),
    }
    fetch_mock = AsyncMock(return_value=node)
    persist_mock = AsyncMock(return_value={"id": "42"})
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "fetch_milestone_node", fetch_mock)
    monkeypatch.setattr(chat_tools, "persist_milestone_preset_data", persist_mock)

    out = await chat_tools.update_milestone_preset_data.ainvoke(
        {
            "operations": [
                {
                    "op": "replace",
                    "path": "/intersections/1/topic",
                    "value": "Monsoon comfort bowls",
                }
            ]
        },
        config={"configurable": {"milestone_id": "42", "location_id": 7, "user_id": "u1"}},
    )
    assert "Saved milestonePresetData" in out
    persist_mock.assert_awaited_once()
    saved_payload = persist_mock.await_args.args[1]
    assert saved_payload["intersections"][1]["topic"] == "Monsoon comfort bowls"


@pytest.mark.asyncio
async def test_update_milestone_preset_data_rejects_invalid_path(monkeypatch: pytest.MonkeyPatch) -> None:
    node = {
        "id": "42",
        "nodeType": "milestone",
        "locationId": 7,
        "data": {"presetId": "culture_hooks"},
        "milestonePresetData": _culture_hooks_payload(),
    }
    fetch_mock = AsyncMock(return_value=node)
    persist_mock = AsyncMock(return_value={"id": "42"})
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "fetch_milestone_node", fetch_mock)
    monkeypatch.setattr(chat_tools, "persist_milestone_preset_data", persist_mock)

    out = await chat_tools.update_milestone_preset_data.ainvoke(
        {
            "operations": [
                {
                    "op": "replace",
                    "path": "/intersections/99/topic",
                    "value": "Out of bounds",
                }
            ]
        },
        config={"configurable": {"milestone_id": "42", "location_id": 7, "user_id": "u1"}},
    )
    assert "Operation #1 failed" in out
    persist_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_milestone_preset_data_validation_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    node = {
        "id": "42",
        "nodeType": "milestone",
        "locationId": 7,
        "data": {"presetId": "culture_hooks"},
        "milestonePresetData": _culture_hooks_payload(),
    }
    fetch_mock = AsyncMock(return_value=node)
    persist_mock = AsyncMock(return_value={"id": "42"})
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "fetch_milestone_node", fetch_mock)
    monkeypatch.setattr(chat_tools, "persist_milestone_preset_data", persist_mock)

    out = await chat_tools.update_milestone_preset_data.ainvoke(
        {
            "operations": [
                {"op": "remove", "path": "/intersections/2"},
                {"op": "remove", "path": "/intersections/1"},
            ]
        },
        config={"configurable": {"milestone_id": "42", "location_id": 7, "user_id": "u1"}},
    )
    assert "Patched data is invalid for this milestone preset" in out
    persist_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_milestone_preset_data_requires_context() -> None:
    out = await chat_tools.update_milestone_preset_data.ainvoke(
        {"operations": [{"op": "replace", "path": "/foo", "value": "bar"}]},
        config={"configurable": {}},
    )
    assert "Milestone context is not available" in out
