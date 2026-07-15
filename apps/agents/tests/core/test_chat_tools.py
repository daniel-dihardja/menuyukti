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


def _campaign_brief_input_payload() -> dict:
    return {
        "type": "campaign_brief",
        "value": {
            "startDate": "2026-06-01",
            "endDate": "2026-06-30",
            "notes": "Promote weekday lunch bundles.",
        },
    }


def _notes_only_input_payload() -> dict:
    return {
        "type": "campaign_brief",
        "value": {
            "notes": "Test 1234",
        },
    }


def _restaurant_campaign_brief_input_payload() -> dict:
    return {
        "type": "restaurant_campaign_brief",
        "value": {
            "notes": "",
            "startDate": "2026-05-01",
            "endDate": "2026-05-31",
        },
    }


def _milestone_node(
    *,
    node_type: str = "milestone",
    location_id: int = 7,
    parent_id: str | None = "100",
    milestone_input: dict | None = None,
    milestone_preset_data: dict | None = None,
) -> dict:
    out: dict = {
        "id": "42",
        "nodeType": node_type,
        "locationId": location_id,
        "data": {"presetId": "campaign_brief"},
        "milestoneInput": milestone_input,
        "milestonePresetData": milestone_preset_data,
    }
    if parent_id is not None:
        out["parentId"] = parent_id
    return out


@pytest.mark.asyncio
async def test_get_milestone_input_json_success(monkeypatch: pytest.MonkeyPatch) -> None:
    node = _milestone_node(milestone_input=_campaign_brief_input_payload())
    fetch_mock = AsyncMock(return_value=node)
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "fetch_milestone_node", fetch_mock)

    out = await chat_tools.get_milestone_input_json.ainvoke(
        {},
        config={"configurable": {"milestone_id": "42", "location_id": 7, "user_id": "u1"}},
    )
    assert "## Input (milestoneInput)" in out
    assert "**Type:**" in out
    assert "Campaign Brief" in out
    assert "**Notes:**" in out


@pytest.mark.asyncio
async def test_get_milestone_input_json_returns_all_fields(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    payload = _campaign_brief_input_payload()
    payload["customTopLevel"] = {"alpha": 1}
    payload["value"]["customNested"] = ["x", "y"]
    node = _milestone_node(milestone_input=payload)
    fetch_mock = AsyncMock(return_value=node)
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "fetch_milestone_node", fetch_mock)

    out = await chat_tools.get_milestone_input_json.ainvoke(
        {},
        config={"configurable": {"milestone_id": "42", "location_id": 7, "user_id": "u1"}},
    )
    assert "**Custom Top Level:**" in out
    assert "**Alpha:**" in out
    assert "**Custom Nested:**" in out


@pytest.mark.asyncio
async def test_get_milestone_preset_data_json_success(monkeypatch: pytest.MonkeyPatch) -> None:
    node = _milestone_node(milestone_preset_data=_culture_hooks_payload())
    fetch_mock = AsyncMock(return_value=node)
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "fetch_milestone_node", fetch_mock)

    out = await chat_tools.get_milestone_preset_data_json.ainvoke(
        {},
        config={"configurable": {"milestone_id": "42", "location_id": 7, "user_id": "u1"}},
    )
    assert "## Preset data (milestonePresetData)" in out
    assert "**Location Concept:**" in out
    assert "Modern Indonesian comfort food" in out


@pytest.mark.asyncio
async def test_get_milestone_input_json_not_set(monkeypatch: pytest.MonkeyPatch) -> None:
    node = _milestone_node(milestone_input=None)
    fetch_mock = AsyncMock(return_value=node)
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "fetch_milestone_node", fetch_mock)

    out = await chat_tools.get_milestone_input_json.ainvoke(
        {},
        config={"configurable": {"milestone_id": "42", "location_id": 7, "user_id": "u1"}},
    )
    assert "(not set)" in out


@pytest.mark.asyncio
async def test_get_milestone_preset_data_json_not_set(monkeypatch: pytest.MonkeyPatch) -> None:
    node = _milestone_node(milestone_preset_data=None)
    fetch_mock = AsyncMock(return_value=node)
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "fetch_milestone_node", fetch_mock)

    out = await chat_tools.get_milestone_preset_data_json.ainvoke(
        {},
        config={"configurable": {"milestone_id": "42", "location_id": 7, "user_id": "u1"}},
    )
    assert "(not set)" in out


@pytest.mark.asyncio
async def test_get_milestone_input_json_requires_context() -> None:
    out = await chat_tools.get_milestone_input_json.ainvoke({}, config={"configurable": {}})
    assert "Milestone context is not available" in out


@pytest.mark.asyncio
async def test_get_milestone_preset_data_json_requires_context() -> None:
    out = await chat_tools.get_milestone_preset_data_json.ainvoke({}, config={"configurable": {}})
    assert "Milestone context is not available" in out


@pytest.mark.asyncio
async def test_get_milestone_preset_data_for_milestone_success(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    node = {
        **_milestone_node(milestone_preset_data=_culture_hooks_payload()),
        "name": "Culture step",
    }
    fetch_mock = AsyncMock(return_value=node)
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "fetch_milestone_node", fetch_mock)

    out = await chat_tools.get_milestone_preset_data_for_milestone.ainvoke(
        {"milestone_id": "42"},
        config={
            "configurable": {
                "workflow_id": "100",
                "location_id": 7,
                "user_id": "u1",
            }
        },
    )
    assert "## Preset data — Culture step (milestonePresetData)" in out
    assert "**Location Concept:**" in out
    assert fetch_mock.await_args is not None
    assert fetch_mock.await_args.args[0] == "42"
    assert fetch_mock.await_args.args[1] == "u1"


@pytest.mark.asyncio
async def test_get_milestone_preset_data_for_milestone_rejects_parent_mismatch(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    node = _milestone_node(milestone_preset_data=_culture_hooks_payload(), parent_id="999")
    fetch_mock = AsyncMock(return_value=node)
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "fetch_milestone_node", fetch_mock)

    out = await chat_tools.get_milestone_preset_data_for_milestone.ainvoke(
        {"milestone_id": "42"},
        config={"configurable": {"workflow_id": "100", "location_id": 7, "user_id": "u1"}},
    )
    assert out == "Error: milestone does not belong to this workflow."


@pytest.mark.asyncio
async def test_get_milestone_preset_data_for_milestone_rejects_bad_milestone_id() -> None:
    out = await chat_tools.get_milestone_preset_data_for_milestone.ainvoke(
        {"milestone_id": "  "},
        config={"configurable": {"workflow_id": "100", "location_id": 7, "user_id": "u1"}},
    )
    assert "numeric id" in out


@pytest.mark.asyncio
async def test_get_milestone_preset_data_for_milestone_requires_workflow_id() -> None:
    out = await chat_tools.get_milestone_preset_data_for_milestone.ainvoke(
        {"milestone_id": "42"},
        config={"configurable": {"location_id": 7, "user_id": "u1"}},
    )
    assert "workflow_id" in out


@pytest.mark.asyncio
async def test_get_milestone_input_json_rejects_non_milestone_node(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    node = _milestone_node(node_type="workflow", milestone_input=_campaign_brief_input_payload())
    fetch_mock = AsyncMock(return_value=node)
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "fetch_milestone_node", fetch_mock)

    out = await chat_tools.get_milestone_input_json.ainvoke(
        {},
        config={"configurable": {"milestone_id": "42", "location_id": 7, "user_id": "u1"}},
    )
    assert out == "Error: node is not a milestone."


@pytest.mark.asyncio
async def test_get_milestone_preset_data_json_rejects_location_mismatch(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    node = _milestone_node(location_id=999, milestone_preset_data=_culture_hooks_payload())
    fetch_mock = AsyncMock(return_value=node)
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "fetch_milestone_node", fetch_mock)

    out = await chat_tools.get_milestone_preset_data_json.ainvoke(
        {},
        config={"configurable": {"milestone_id": "42", "location_id": 7, "user_id": "u1"}},
    )
    assert out == "Error: milestone location does not match the campaign context."


@pytest.mark.asyncio
async def test_update_milestone_input_replace_success(monkeypatch: pytest.MonkeyPatch) -> None:
    node = {
        "id": "42",
        "nodeType": "milestone",
        "locationId": 7,
        "data": {"presetId": "campaign_brief"},
        "milestoneInput": _campaign_brief_input_payload(),
    }
    fetch_mock = AsyncMock(return_value=node)
    persist_mock = AsyncMock(return_value={"id": "42"})
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "fetch_milestone_node", fetch_mock)
    monkeypatch.setattr(chat_tools, "persist_milestone_input", persist_mock)

    out = await chat_tools.update_milestone_input.ainvoke(
        {
            "operations": [
                {
                    "op": "replace",
                    "path": "/value/notes",
                    "value": "Focus on office-worker set menu urgency.",
                }
            ]
        },
        config={"configurable": {"milestone_id": "42", "location_id": 7, "user_id": "u1"}},
    )
    assert "Saved milestoneInput" in out
    persist_mock.assert_awaited_once()
    saved_payload = persist_mock.await_args.args[1]
    assert saved_payload["value"]["notes"] == "Focus on office-worker set menu urgency."


@pytest.mark.asyncio
async def test_update_milestone_input_dry_run(monkeypatch: pytest.MonkeyPatch) -> None:
    node = {
        "id": "42",
        "nodeType": "milestone",
        "locationId": 7,
        "data": {"presetId": "campaign_brief"},
        "milestoneInput": _campaign_brief_input_payload(),
    }
    fetch_mock = AsyncMock(return_value=node)
    persist_mock = AsyncMock(return_value={"id": "42"})
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "fetch_milestone_node", fetch_mock)
    monkeypatch.setattr(chat_tools, "persist_milestone_input", persist_mock)

    out = await chat_tools.update_milestone_input.ainvoke(
        {
            "operations": [
                {"op": "replace", "path": "/value/notes", "value": "Dry run only"},
            ],
            "dry_run": True,
        },
        config={"configurable": {"milestone_id": "42", "location_id": 7, "user_id": "u1"}},
    )
    assert "dry_run=true" in out
    persist_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_milestone_input_notes_only_replace_success(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    node = {
        "id": "42",
        "nodeType": "milestone",
        "locationId": 7,
        "data": {"presetId": "campaign_brief"},
        "milestoneInput": _notes_only_input_payload(),
    }
    fetch_mock = AsyncMock(return_value=node)
    persist_mock = AsyncMock(return_value={"id": "42"})
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "fetch_milestone_node", fetch_mock)
    monkeypatch.setattr(chat_tools, "persist_milestone_input", persist_mock)

    out = await chat_tools.update_milestone_input.ainvoke(
        {
            "operations": [
                {"op": "replace", "path": "/value/notes", "value": "Updated from chat"},
            ]
        },
        config={"configurable": {"milestone_id": "42", "location_id": 7, "user_id": "u1"}},
    )
    assert "Saved milestoneInput" in out
    persist_mock.assert_awaited_once()
    saved_payload = persist_mock.await_args.args[1]
    assert saved_payload["value"]["notes"] == "Updated from chat"


@pytest.mark.asyncio
async def test_update_milestone_input_shorthand_notes_path_maps_to_value(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    node = {
        "id": "42",
        "nodeType": "milestone",
        "locationId": 7,
        "data": {"presetId": "campaign_brief"},
        "milestoneInput": _notes_only_input_payload(),
    }
    fetch_mock = AsyncMock(return_value=node)
    persist_mock = AsyncMock(return_value={"id": "42"})
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "fetch_milestone_node", fetch_mock)
    monkeypatch.setattr(chat_tools, "persist_milestone_input", persist_mock)

    out = await chat_tools.update_milestone_input.ainvoke(
        {"operations": [{"op": "replace", "path": "/notes", "value": "Shorthand update"}]},
        config={"configurable": {"milestone_id": "42", "location_id": 7, "user_id": "u1"}},
    )
    assert "Saved milestoneInput" in out
    persist_mock.assert_awaited_once()
    saved_payload = persist_mock.await_args.args[1]
    assert saved_payload["value"]["notes"] == "Shorthand update"


@pytest.mark.asyncio
async def test_update_milestone_input_restaurant_campaign_brief_end_date_shorthand(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    node = {
        "id": "42",
        "nodeType": "milestone",
        "locationId": 7,
        "data": {"presetId": "restaurant_campaign_brief"},
        "milestoneInput": _restaurant_campaign_brief_input_payload(),
    }
    fetch_mock = AsyncMock(return_value=node)
    persist_mock = AsyncMock(return_value={"id": "42"})
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "fetch_milestone_node", fetch_mock)
    monkeypatch.setattr(chat_tools, "persist_milestone_input", persist_mock)

    out = await chat_tools.update_milestone_input.ainvoke(
        {"operations": [{"op": "replace", "path": "/endDate", "value": "2026-06-07"}]},
        config={"configurable": {"milestone_id": "42", "location_id": 7, "user_id": "u1"}},
    )
    assert "Saved milestoneInput" in out
    persist_mock.assert_awaited_once()
    saved_payload = persist_mock.await_args.args[1]
    assert saved_payload["value"]["endDate"] == "2026-06-07"


@pytest.mark.asyncio
async def test_update_milestone_input_rejects_invalid_path(monkeypatch: pytest.MonkeyPatch) -> None:
    node = {
        "id": "42",
        "nodeType": "milestone",
        "locationId": 7,
        "data": {"presetId": "campaign_brief"},
        "milestoneInput": _campaign_brief_input_payload(),
    }
    fetch_mock = AsyncMock(return_value=node)
    persist_mock = AsyncMock(return_value={"id": "42"})
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "fetch_milestone_node", fetch_mock)
    monkeypatch.setattr(chat_tools, "persist_milestone_input", persist_mock)

    out = await chat_tools.update_milestone_input.ainvoke(
        {
            "operations": [
                {"op": "replace", "path": "/value/unknown/deep", "value": "Out of bounds"},
            ]
        },
        config={"configurable": {"milestone_id": "42", "location_id": 7, "user_id": "u1"}},
    )
    assert "Operation #1 failed" in out
    persist_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_milestone_input_validation_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    node = {
        "id": "42",
        "nodeType": "milestone",
        "locationId": 7,
        "data": {"presetId": "campaign_brief"},
        "milestoneInput": _campaign_brief_input_payload(),
    }
    fetch_mock = AsyncMock(return_value=node)
    persist_mock = AsyncMock(return_value={"id": "42"})
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "fetch_milestone_node", fetch_mock)
    monkeypatch.setattr(chat_tools, "persist_milestone_input", persist_mock)

    out = await chat_tools.update_milestone_input.ainvoke(
        {"operations": [{"op": "replace", "path": "/type", "value": "dates"}]},
        config={"configurable": {"milestone_id": "42", "location_id": 7, "user_id": "u1"}},
    )
    assert "Patched milestoneInput is invalid" in out
    persist_mock.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_milestone_input_requires_context() -> None:
    out = await chat_tools.update_milestone_input.ainvoke(
        {"operations": [{"op": "replace", "path": "/foo", "value": "bar"}]},
        config={"configurable": {}},
    )
    assert "Milestone context is not available" in out


@pytest.mark.asyncio
async def test_update_milestone_input_missing_operations_returns_guidance(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    node = {
        "id": "42",
        "nodeType": "milestone",
        "locationId": 7,
        "data": {"presetId": "campaign_brief"},
        "milestoneInput": _notes_only_input_payload(),
    }
    fetch_mock = AsyncMock(return_value=node)
    persist_mock = AsyncMock(return_value={"id": "42"})
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "fetch_milestone_node", fetch_mock)
    monkeypatch.setattr(chat_tools, "persist_milestone_input", persist_mock)

    out = await chat_tools.update_milestone_input.ainvoke(
        {"dry_run": False},
        config={"configurable": {"milestone_id": "42", "location_id": 7, "user_id": "u1"}},
    )
    assert "Missing required field 'operations'" in out
    persist_mock.assert_not_awaited()
