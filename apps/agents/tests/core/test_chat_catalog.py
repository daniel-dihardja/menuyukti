"""Tests for workflow catalog prefetch helper."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from agents_app.agents.core.chat import catalog as chat_catalog


def _tree(*, location_id: int = 7) -> dict:
    return {
        "workflow": {"id": "100", "name": "Summer campaign", "locationId": location_id},
        "milestones": [
            {
                "milestone": {
                    "id": "42",
                    "name": "Campaign Brief",
                    "milestoneGoal": None,
                    "data": {"presetId": "restaurant_campaign_brief"},
                }
            },
        ],
    }


@pytest.mark.asyncio
async def test_load_workflow_catalog_markdown_success(monkeypatch: pytest.MonkeyPatch) -> None:
    fetch_mock = AsyncMock(return_value=_tree())
    monkeypatch.setattr(chat_catalog, "fetch_workflow_campaign_tree", fetch_mock)

    out = await chat_catalog.load_workflow_catalog_markdown(
        workflow_id="100",
        user_id="u1",
        location_id=7,
        selected_milestone_id="42",
        client=MagicMock(),
    )
    assert "# Workflow overview" in out
    assert "Campaign Brief" in out
    assert "**(selected in UI)**" in out
    fetch_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_load_workflow_catalog_markdown_location_mismatch(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fetch_mock = AsyncMock(return_value=_tree(location_id=99))
    monkeypatch.setattr(chat_catalog, "fetch_workflow_campaign_tree", fetch_mock)

    out = await chat_catalog.load_workflow_catalog_markdown(
        workflow_id="100",
        user_id="u1",
        location_id=7,
        selected_milestone_id=None,
        client=MagicMock(),
    )
    assert "catalog unavailable" in out.lower()


@pytest.mark.asyncio
async def test_load_workflow_catalog_markdown_missing_location() -> None:
    out = await chat_catalog.load_workflow_catalog_markdown(
        workflow_id="100",
        user_id="u1",
        location_id=None,
        selected_milestone_id=None,
        client=MagicMock(),
    )
    assert "catalog unavailable" in out.lower()


@pytest.mark.asyncio
async def test_load_workflow_catalog_markdown_fetch_error(monkeypatch: pytest.MonkeyPatch) -> None:
    fetch_mock = AsyncMock(side_effect=RuntimeError("boom"))
    monkeypatch.setattr(chat_catalog, "fetch_workflow_campaign_tree", fetch_mock)

    out = await chat_catalog.load_workflow_catalog_markdown(
        workflow_id="100",
        user_id="u1",
        location_id=7,
        selected_milestone_id=None,
        client=MagicMock(),
    )
    assert "catalog unavailable" in out.lower()


@pytest.mark.asyncio
async def test_load_workflow_catalog_markdown_missing_tree(monkeypatch: pytest.MonkeyPatch) -> None:
    fetch_mock = AsyncMock(return_value=None)
    monkeypatch.setattr(chat_catalog, "fetch_workflow_campaign_tree", fetch_mock)

    out = await chat_catalog.load_workflow_catalog_markdown(
        workflow_id="100",
        user_id="u1",
        location_id=7,
        selected_milestone_id=None,
        client=MagicMock(),
    )
    assert "catalog unavailable" in out.lower()
