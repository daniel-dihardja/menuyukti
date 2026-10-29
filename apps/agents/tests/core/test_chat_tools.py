from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from agents_app.agents.core.chat import tools as chat_tools


def _location_page_payload() -> dict:
    return {
        "name": "Harbor Kitchen",
        "street": "5 Pier Lane",
        "city": "Hamburg",
        "country": "DE",
        "currency": "EUR",
        "openingHours": [
            {"dayOfWeek": "friday", "openTime": "12:00", "closeTime": "23:00"},
        ],
        "manualBriefInput": {
            "locationId": 7,
            "quickProfile": {"cuisineTypes": ["Seafood"]},
        },
    }


@pytest.mark.asyncio
async def test_get_location_data_returns_formatted_markdown(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    graphql_mock = AsyncMock(return_value={"location": _location_page_payload()})
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "graphql_post", graphql_mock)

    out = await chat_tools.get_location_data.ainvoke(
        {},
        config={"configurable": {"location_id": 7, "user_id": "u1"}},
    )
    assert "**Name**: Harbor Kitchen" in out
    assert "**friday**: 12:00–23:00" in out
    assert "**Cuisine types**: Seafood" in out
    graphql_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_location_data_missing_location_context() -> None:
    out = await chat_tools.get_location_data.ainvoke(
        {},
        config={"configurable": {"user_id": "u1"}},
    )
    assert "Location context is not available" in out


@pytest.mark.asyncio
async def test_get_location_data_not_found(monkeypatch: pytest.MonkeyPatch) -> None:
    graphql_mock = AsyncMock(return_value={"location": None})
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "graphql_post", graphql_mock)

    out = await chat_tools.get_location_data.ainvoke(
        {},
        config={"configurable": {"location_id": 7, "user_id": "u1"}},
    )
    assert out == "Location not found or access denied."


@pytest.mark.asyncio
async def test_get_advisor_memory_returns_wrapped_content(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    graphql_mock = AsyncMock(
        return_value={
            "location": {
                "id": "7",
                "advisorMemory": {
                    "locationId": 7,
                    "content": "Do not promote lunch specials.",
                    "updatedAt": "2026-10-29T10:00:00Z",
                },
            }
        }
    )
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "graphql_post", graphql_mock)

    out = await chat_tools.get_advisor_memory.ainvoke(
        {},
        config={"configurable": {"location_id": 7, "user_id": "u1"}},
    )
    assert "BEGIN_UNTRUSTED_DATA" in out
    assert "channel=advisor_memory" in out
    assert "Do not promote lunch specials." in out
    graphql_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_get_advisor_memory_empty(monkeypatch: pytest.MonkeyPatch) -> None:
    graphql_mock = AsyncMock(
        return_value={
            "location": {
                "id": "7",
                "advisorMemory": {"locationId": 7, "content": "", "updatedAt": None},
            }
        }
    )
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "graphql_post", graphql_mock)

    out = await chat_tools.get_advisor_memory.ainvoke(
        {},
        config={"configurable": {"location_id": 7, "user_id": "u1"}},
    )
    assert "empty" in out.lower()
    assert "BEGIN_UNTRUSTED_DATA" in out


@pytest.mark.asyncio
async def test_get_advisor_memory_missing_location_context() -> None:
    out = await chat_tools.get_advisor_memory.ainvoke(
        {},
        config={"configurable": {"user_id": "u1"}},
    )
    assert "Location context is not available" in out


@pytest.mark.asyncio
async def test_update_advisor_memory_success(monkeypatch: pytest.MonkeyPatch) -> None:
    graphql_mock = AsyncMock(
        return_value={
            "updateLocationAdvisorMemory": {
                "locationId": 7,
                "content": "Prefer weekend brunch posts.",
                "updatedAt": "2026-10-29T10:00:00Z",
            }
        }
    )
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "graphql_post", graphql_mock)

    out = await chat_tools.update_advisor_memory.ainvoke(
        {"content": "Prefer weekend brunch posts."},
        config={"configurable": {"location_id": 7, "user_id": "u1"}},
    )
    assert "updated" in out.lower()
    kwargs = graphql_mock.await_args.args
    assert kwargs[2]["locationId"] == 7
    assert kwargs[2]["content"] == "Prefer weekend brunch posts."


@pytest.mark.asyncio
async def test_update_advisor_memory_clear(monkeypatch: pytest.MonkeyPatch) -> None:
    graphql_mock = AsyncMock(
        return_value={
            "updateLocationAdvisorMemory": {
                "locationId": 7,
                "content": "",
                "updatedAt": None,
            }
        }
    )
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "graphql_post", graphql_mock)

    out = await chat_tools.update_advisor_memory.ainvoke(
        {"content": ""},
        config={"configurable": {"location_id": 7, "user_id": "u1"}},
    )
    assert "cleared" in out.lower()
    assert graphql_mock.await_args.args[2]["content"] == ""


@pytest.mark.asyncio
async def test_update_advisor_memory_soft_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    graphql_mock = AsyncMock(side_effect=RuntimeError("graphql boom"))
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "graphql_post", graphql_mock)

    out = await chat_tools.update_advisor_memory.ainvoke(
        {"content": "note"},
        config={"configurable": {"location_id": 7, "user_id": "u1"}},
    )
    assert out == "Error running update_advisor_memory: tool failed"
    assert "graphql boom" not in out


@pytest.mark.asyncio
async def test_get_chart_data_missing_location_context() -> None:
    out = await chat_tools.get_chart_data.ainvoke(
        {"chart_id": "venue_slot_strength_heatmap"},
        config={"configurable": {"user_id": "u1"}},
    )
    assert "Location context is not available" in out


@pytest.mark.asyncio
async def test_get_chart_data_loads_markdown(monkeypatch: pytest.MonkeyPatch) -> None:
    load_mock = AsyncMock(return_value="## Visualization data — Venue slot strength\n- ok")
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "load_chart_data_markdown", load_mock)

    out = await chat_tools.get_chart_data.ainvoke(
        {"chart_id": "venue_slot_strength_heatmap"},
        config={
            "configurable": {
                "location_id": 7,
                "user_id": "u1",
                "analytics_run_id": 99,
            }
        },
    )
    assert "Venue slot strength" in out
    load_mock.assert_awaited_once()
    kwargs = load_mock.await_args.kwargs
    assert kwargs["chart_id"] == "venue_slot_strength_heatmap"
    assert kwargs["location_id"] == 7
    assert kwargs["user_id"] == "u1"
    assert kwargs["analytics_run_id"] == 99


@pytest.mark.asyncio
async def test_get_chart_data_soft_fails_on_load_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    load_mock = AsyncMock(side_effect=RuntimeError("graphql boom"))
    monkeypatch.setattr(chat_tools, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(chat_tools, "load_chart_data_markdown", load_mock)

    out = await chat_tools.get_chart_data.ainvoke(
        {"chart_id": "venue_slot_strength_heatmap"},
        config={"configurable": {"location_id": 7, "user_id": "u1"}},
    )
    # Soft-fail path must not leak raw backend errors to the model (TASK-8.6).
    assert out == "Error running get_chart_data: tool failed"
    assert "graphql boom" not in out


@pytest.mark.asyncio
async def test_get_inventory_refill_forecast_returns_json(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from agents_app.agents.core.chat import inventory_refill_forecast as forecast_mod

    rows = [
        {
            "name": "Oat milk",
            "daysUntilRefill": 2.0,
            "priorityRank": 1,
            "confidence": "ok",
            "windowDays": 14,
        }
    ]
    graphql_mock = AsyncMock(return_value={"inventoryRefillForecast": rows})
    monkeypatch.setattr(forecast_mod, "get_chat_http_client", lambda: object())
    monkeypatch.setattr(forecast_mod, "graphql_post", graphql_mock)

    out = await forecast_mod.get_inventory_refill_forecast.ainvoke(
        {"window_days": 14},
        config={"configurable": {"location_id": 7, "user_id": "u1"}},
    )
    assert "Oat milk" in out
    assert "daysUntilRefill" in out
    graphql_mock.assert_awaited_once()
    assert graphql_mock.await_args.args[2] == {"locationId": "7", "windowDays": 14}


@pytest.mark.asyncio
async def test_get_inventory_refill_forecast_missing_location() -> None:
    from agents_app.agents.core.chat import inventory_refill_forecast as forecast_mod

    out = await forecast_mod.get_inventory_refill_forecast.ainvoke(
        {},
        config={"configurable": {"user_id": "u1"}},
    )
    assert "Location context is not available" in out
