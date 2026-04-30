"""Unit tests for milestone run tool pool."""

from __future__ import annotations

import json
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


def _tool_by_name(tools: list[Any], name: str) -> Any:
    for t in tools:
        if getattr(t, "name", "") == name:
            return t
    raise AssertionError(f"no tool named {name!r}")


def _tools_for_context(
    context: dict[str, Any],
    *,
    client: Any | None = None,
    extra_tool_ids: list[str] | None = None,
) -> list[Any]:
    from agents_app.agents.core.milestone_run.tools import make_milestone_run_tools

    c = client if client is not None else MagicMock(spec=AsyncMock)
    return make_milestone_run_tools(
        context,
        "ms-1",
        42,
        "user-1",
        client=c,
        extra_tool_ids=extra_tool_ids or (),
    )


def test_make_milestone_run_tools_core_only_has_five_builtins() -> None:
    tools = _tools_for_context({})
    names = [getattr(t, "name", "") for t in tools]
    assert len(tools) == 5
    assert "get_public_holidays" not in names
    assert "write_result" not in names
    assert "write_result_data" in names


def test_make_milestone_run_tools_appends_workspace_adapter_tools() -> None:
    ctx: dict[str, Any] = {
        "api_adapter_tools": [
            {
                "tool_key": "menu_promotions_mock_api",
                "url": "http://127.0.0.1:3090/api/mock",
                "description": "Mock promotions JSON",
            },
        ],
    }
    tools = _tools_for_context(ctx)
    names = [getattr(t, "name", "") for t in tools]
    assert len(tools) == 6
    assert "menu_promotions_mock_api" in names


def test_read_goal_returns_context_goal() -> None:
    ctx = {"goal": "Ship the campaign"}
    tools = _tools_for_context(ctx)
    read_goal = _tool_by_name(tools, "read_goal")
    out = read_goal.invoke({})
    assert out == "Ship the campaign"


def test_read_criteria_returns_json() -> None:
    ctx = {
        "criteria": [
            {"id": "c1", "requirement": "Has numbers"},
        ]
    }
    tools = _tools_for_context(ctx)
    read_criteria = _tool_by_name(tools, "read_criteria")
    out = read_criteria.invoke({})
    assert '"id": "c1"' in out
    assert "Has numbers" in out


def test_read_data_returns_raw_data() -> None:
    ctx = {"raw_data": "# Notes\n\nHello"}
    tools = _tools_for_context(ctx)
    read_data = _tool_by_name(tools, "read_data")
    out = read_data.invoke({})
    assert out.startswith("# Notes")


def test_read_data_returns_json_from_result_data() -> None:
    payload = json.dumps(
        {"startDate": "2026-06-01", "endDate": "2026-06-30", "publicHolidays": []},
        ensure_ascii=False,
        indent=2,
    )
    ctx = {"result_data": payload}
    tools = _tools_for_context(ctx)
    read_data = _tool_by_name(tools, "read_data")
    out = read_data.invoke({})
    assert '"startDate": "2026-06-01"' in out


def test_read_data_placeholder_when_only_milestone_data_in_context() -> None:
    from agents_app.agents.core.milestone_run.tools.read_data import READ_DATA_EMPTY_MESSAGE

    ctx = {
        "milestone_data": {
            "startDate": "2026-06-01",
            "endDate": "2026-06-30",
            "publicHolidays": [],
        }
    }
    tools = _tools_for_context(ctx)
    read_data = _tool_by_name(tools, "read_data")
    out = read_data.invoke({})
    assert out == READ_DATA_EMPTY_MESSAGE


def test_read_prior_milestones_returns_context() -> None:
    ctx = {
        "prior_milestones_data": json.dumps(
            [{"title": "Campaign Brief", "data": "**Start:** 2026-05-01"}],
            ensure_ascii=False,
        )
    }
    tools = _tools_for_context(ctx)
    read_prior = _tool_by_name(tools, "read_prior_milestones_data")
    out = read_prior.invoke({})
    assert "Campaign Brief" in out
    assert "2026-05-01" in out


def test_read_prior_milestones_empty_shows_message() -> None:
    ctx: dict[str, Any] = {}
    tools = _tools_for_context(ctx)
    read_prior = _tool_by_name(tools, "read_prior_milestones_data")
    out = read_prior.invoke({})
    assert "No prior milestone data available" in out


def test_extra_tool_ids_includes_get_public_holidays() -> None:
    tools = _tools_for_context({}, extra_tool_ids=["get_public_holidays"])
    names = [getattr(t, "name", "") for t in tools]
    assert "get_public_holidays" in names
    assert names.index("get_public_holidays") < names.index("write_result_data")


def test_extra_tool_ids_includes_get_promotion_candidates() -> None:
    tools = _tools_for_context({}, extra_tool_ids=["get_promotion_candidates"])
    names = [getattr(t, "name", "") for t in tools]
    assert "get_promotion_candidates" in names
    assert names.index("get_promotion_candidates") < names.index("write_result_data")


def test_extra_tool_ids_includes_get_prior_campaign_context() -> None:
    tools = _tools_for_context({}, extra_tool_ids=["get_prior_campaign_context"])
    names = [getattr(t, "name", "") for t in tools]
    assert "get_prior_campaign_context" in names
    assert names.index("get_prior_campaign_context") < names.index("write_result_data")


def test_extra_tool_ids_includes_get_scheduler_plan() -> None:
    tools = _tools_for_context(
        {"workflow_id": "wf-1", "milestone_id": "ms-1"},
        extra_tool_ids=["get_scheduler_plan"],
    )
    names = [getattr(t, "name", "") for t in tools]
    assert "get_scheduler_plan" in names
    assert names.index("get_scheduler_plan") < names.index("write_result_data")


@pytest.mark.asyncio
async def test_get_public_holidays_formats_list() -> None:
    ctx: dict[str, Any] = {}
    client = MagicMock(spec=AsyncMock)

    with patch(
        "agents_app.agents.core.milestone_run.tools.get_public_holidays.fetch_public_holidays_for_milestone",
        new=AsyncMock(
            return_value=(
                [
                    {"date": "2025-01-01", "name": "New Year's Day", "localName": "New Year's Day"},
                ],
                None,
            )
        ),
    ):
        tools = _tools_for_context(ctx, client=client, extra_tool_ids=["get_public_holidays"])
        get_public_holidays = _tool_by_name(tools, "get_public_holidays")
        out = await get_public_holidays.ainvoke(
            {"start_date": "2025-01-01", "end_date": "2025-01-31"}
        )

    assert "2025-01-01" in out
    assert "New Year's Day" in out


@pytest.mark.asyncio
async def test_get_promotion_candidates_formats_ranked_output() -> None:
    ctx: dict[str, Any] = {}
    client = MagicMock(spec=AsyncMock)

    with patch(
        "agents_app.agents.core.milestone_run.tools.get_promotion_candidates.fetch_location_operating_signals",
        new=AsyncMock(
            return_value={
                "analytics_run": {"id": "1", "name": "Run 1"},
                "operating_profile": None,
                "category_mix": None,
                "promotion_menu_items": {
                    "periodStart": "2026-01-01",
                    "periodEnd": "2026-01-31",
                    "items": [],
                },
                "promotion_candidates_signals": {
                    "itemsTotalCount": 4,
                    "itemsTruncated": False,
                    "topPromote": [
                        {
                            "menu": "Nasi Goreng",
                            "recommendation": "promote",
                            "score": 100.0,
                            "quantity": 100,
                            "totalRevenue": 5000.0,
                            "signalReasons": ["Tagged as content hero in Instagram signals"],
                        }
                    ],
                    "topAvoid": [
                        {
                            "menu": "Iced Tea",
                            "recommendation": "avoid",
                            "score": 12.0,
                            "quantity": 50,
                            "totalRevenue": 1000.0,
                            "signalReasons": ["Flagged as avoid or low_end"],
                        }
                    ],
                    "puzzleOpportunityPool": {
                        "puzzleItemsFound": 2,
                        "threshold": 72.0,
                        "selectedCount": 1,
                        "selected": [
                            {
                                "menu": "Truffle Pasta",
                                "recommendation": "promote",
                                "score": 78.0,
                                "quantity": 40,
                                "totalRevenue": 3200.0,
                                "signalReasons": ["Tagged as rising trend in Instagram signals"],
                                "whySelected": ["Balanced potential: qty 40, revenue 3200.00."],
                                "howToPromoteOnInstagram": [
                                    "Angle",
                                    "Format",
                                    "Timing & CTA",
                                ],
                            }
                        ],
                    },
                    "rankedCandidates": [
                        {
                            "menu": "Nasi Goreng",
                            "recommendation": "promote",
                            "score": 100.0,
                            "quantity": 100,
                            "totalRevenue": 5000.0,
                            "signalReasons": ["Tagged as content hero in Instagram signals"],
                        },
                        {
                            "menu": "Truffle Pasta",
                            "recommendation": "promote",
                            "score": 78.0,
                            "quantity": 40,
                            "totalRevenue": 3200.0,
                            "signalReasons": ["Tagged as rising trend in Instagram signals"],
                        },
                        {
                            "menu": "Lava Cake",
                            "recommendation": "test",
                            "score": 52.0,
                            "quantity": 30,
                            "totalRevenue": 1800.0,
                            "signalReasons": ["Menu engineering category is puzzle"],
                        },
                        {
                            "menu": "Iced Tea",
                            "recommendation": "avoid",
                            "score": 12.0,
                            "quantity": 50,
                            "totalRevenue": 1000.0,
                            "signalReasons": ["Flagged as avoid or low_end"],
                        },
                    ],
                    "rankedCandidatesTotalCount": 4,
                    "bestPostingWindow": {"peakDay": "fri", "peakHour": 19},
                    "bestPostingWindowSummary": "peak day: fri, peak hour: 19:00",
                },
                "instagram_signals": {},
            }
        ),
    ):
        tools = _tools_for_context(ctx, client=client, extra_tool_ids=["get_promotion_candidates"])
        get_promotion_candidates = _tool_by_name(tools, "get_promotion_candidates")
        out = await get_promotion_candidates.ainvoke({})

    payload = json.loads(out)
    assert payload["analyticsRun"]["name"] == "Run 1"
    assert payload["totals"]["menuItemsEvaluated"] == 4
    assert len(payload["topPromote"]) >= 1
    assert any(r["menu"] == "Nasi Goreng" for r in payload["rankedCandidates"])
    assert any(r["menu"] == "Truffle Pasta" for r in payload["rankedCandidates"])
    assert any(r["menu"] == "Iced Tea" for r in payload["rankedCandidates"])
    assert payload.get("rankedCandidatesTotalCount") == 4
    assert payload.get("rankedCandidatesTruncated") is False
    assert len(payload["rankedCandidates"]) == 4
    rc0 = payload["rankedCandidates"][0]
    assert set(rc0.keys()) == {
        "menu",
        "recommendation",
        "score",
        "quantity",
        "totalRevenue",
        "signalReasons",
    }
    pool = payload["puzzleOpportunityPool"]
    assert pool["puzzleItemsFound"] == 2
    assert pool["selectedCount"] >= 1
    selected = pool["selected"]
    assert isinstance(selected, list)
    assert any(s.get("menu") == "Truffle Pasta" for s in selected)
    for row in selected:
        assert "whySelected" in row
        assert "howToPromoteOnInstagram" in row


@pytest.mark.asyncio
async def test_get_promotion_candidates_truncates_large_menu() -> None:
    """Large menus cap rankedCandidates so the ReAct LLM turn stays bounded."""
    ctx: dict[str, Any] = {}
    client = MagicMock(spec=AsyncMock)
    items: list[dict[str, Any]] = []
    for i in range(40):
        items.append(
            {
                "menu": f"Dish {i:02d}",
                "quantity": 10 + i,
                "totalRevenue": float(100 + i * 10),
                "menuCategory": "Main",
                "menuCategoryDetail": "X",
                "category": "plow_horse",
                "action": "promote",
                "peakDay": "mon",
                "peakHour": 12,
                "contributionMarginPercentage": 0.2,
            }
        )

    with patch(
        "agents_app.agents.core.milestone_run.tools.get_promotion_candidates.fetch_location_operating_signals",
        new=AsyncMock(
            return_value={
                "analytics_run": {"id": "1", "name": "Run 1"},
                "operating_profile": None,
                "category_mix": None,
                "promotion_menu_items": {
                    "periodStart": "2026-01-01",
                    "periodEnd": "2026-01-31",
                    "items": items,
                },
                "promotion_candidates_signals": {
                    "itemsTotalCount": 40,
                    "itemsTruncated": False,
                    "topPromote": items[:8],
                    "topAvoid": [],
                    "puzzleOpportunityPool": {
                        "puzzleItemsFound": 0,
                        "threshold": 0.0,
                        "selectedCount": 0,
                        "selected": [],
                    },
                    "rankedCandidates": items,
                    "rankedCandidatesTotalCount": 40,
                    "bestPostingWindow": None,
                    "bestPostingWindowSummary": "not available",
                },
                "instagram_signals": {},
            }
        ),
    ):
        tools = _tools_for_context(ctx, client=client, extra_tool_ids=["get_promotion_candidates"])
        get_promotion_candidates = _tool_by_name(tools, "get_promotion_candidates")
        out = await get_promotion_candidates.ainvoke({})

    payload = json.loads(out)
    assert payload["totals"]["menuItemsEvaluated"] == 40
    assert payload["rankedCandidatesTotalCount"] == 40
    assert payload["rankedCandidatesTruncated"] is True
    assert len(payload["rankedCandidates"]) == 30
    assert set(payload["rankedCandidates"][0].keys()) == {
        "menu",
        "recommendation",
        "score",
        "quantity",
        "totalRevenue",
        "signalReasons",
    }


@pytest.mark.asyncio
async def test_get_scheduler_plan_formats_schedule_payload() -> None:
    ctx: dict[str, Any] = {"workflow_id": "77", "milestone_id": "88"}
    client = MagicMock(spec=AsyncMock)

    with patch(
        "agents_app.agents.core.milestone_run.tools.get_scheduler_plan.fetch_campaign_schedule_plan",
        new=AsyncMock(
            return_value={
                "analyticsRunId": "5",
                "campaignStart": "2026-06-01",
                "campaignEnd": "2026-06-30",
                "timezone": "Asia/Jakarta",
                "postsPerWeek": 4,
                "sourceSignalsSummary": "signals summary",
                "slots": [
                    {
                        "dateTime": "2026-06-03T19:00:00",
                        "postType": "carousel",
                        "promotedMenuItems": ["Nasi Goreng", "Truffle Pasta"],
                        "visualIdea": "Kitchen action + close-up",
                        "captionIdea": "Highlight dinner favorites",
                    }
                ],
            }
        ),
    ):
        tools = _tools_for_context(ctx, client=client, extra_tool_ids=["get_scheduler_plan"])
        get_scheduler_plan = _tool_by_name(tools, "get_scheduler_plan")
        out = await get_scheduler_plan.ainvoke({})

    payload = json.loads(out)
    assert payload["campaignStart"] == "2026-06-01"
    assert payload["campaignEnd"] == "2026-06-30"
    assert payload["postsPerWeek"] == 4
    assert len(payload["slots"]) == 1
    assert payload["slots"][0]["type"] == "carousel"
    assert payload["slots"][0]["promotedMenuItems"] == ["Nasi Goreng", "Truffle Pasta"]


def test_get_prior_campaign_context_extracts_dates_and_brand_brief() -> None:
    tools = _tools_for_context({}, extra_tool_ids=["get_prior_campaign_context"])
    get_prior_campaign_context = _tool_by_name(tools, "get_prior_campaign_context")
    sample = (
        "## Dates\n\n## Start date\n\n2026-05-01\n\n## End date\n\n2026-05-31\n\n"
        "## Brand brief\n\nTone: warm and premium.\n"
    )
    out = get_prior_campaign_context.invoke({"prior_milestones_json": sample})
    assert "Start date: 2026-05-01" in out
    assert "End date: 2026-05-31" in out
    assert "Brand brief found: yes" in out


def test_get_prior_campaign_context_parses_json_prior_rows() -> None:
    tools = _tools_for_context({}, extra_tool_ids=["get_prior_campaign_context"])
    get_prior_campaign_context = _tool_by_name(tools, "get_prior_campaign_context")
    sample = json.dumps(
        [
            {
                "title": "Dates",
                "data": {
                    "startDate": "2026-06-01",
                    "endDate": "2026-06-15",
                    "publicHolidays": [],
                },
            }
        ],
        ensure_ascii=False,
    )
    out = get_prior_campaign_context.invoke({"prior_milestones_json": sample})
    assert "Start date: 2026-06-01" in out
    assert "End date: 2026-06-15" in out
    assert '"campaign_window_found": true' in out


@pytest.mark.asyncio
async def test_write_result_data_upserts_and_updates_context() -> None:
    ctx: dict[str, Any] = {}
    client = MagicMock(spec=AsyncMock)

    with patch(
        "agents_app.agents.core.milestone_run.tools.write_result_data.upsert_milestonedata_node",
        new=AsyncMock(return_value={"id": "md-9"}),
    ) as mock_upsert:
        tools = _tools_for_context(ctx, client=client)
        write_result_data = _tool_by_name(tools, "write_result_data")
        out = await write_result_data.ainvoke({"new_data": "Updated body"})

    mock_upsert.assert_awaited_once()
    assert ctx.get("result_data") == "Updated body"
    assert "md-9" in out


@pytest.mark.asyncio
async def test_write_result_data_parses_structured_json_when_context_is_structured() -> None:
    ctx: dict[str, Any] = {
        "milestone_data": {
            "startDate": "",
            "endDate": "",
            "publicHolidays": [],
        }
    }
    client = MagicMock(spec=AsyncMock)

    with patch(
        "agents_app.agents.core.milestone_run.tools.write_result_data.upsert_milestonedata_node",
        new=AsyncMock(return_value={"id": "md-10"}),
    ) as mock_upsert:
        tools = _tools_for_context(ctx, client=client)
        write_result_data = _tool_by_name(tools, "write_result_data")
        out = await write_result_data.ainvoke(
            {
                "new_data": '{"startDate":"2026-06-01","endDate":"2026-06-30","publicHolidays":[]}'
            }
        )

    mock_upsert.assert_awaited_once()
    awaited_payload = mock_upsert.await_args.args[2]
    assert awaited_payload == {
        "startDate": "2026-06-01",
        "endDate": "2026-06-30",
        "publicHolidays": [],
    }
    assert isinstance(ctx.get("milestone_data"), dict)
    assert "md-10" in out


@pytest.mark.asyncio
async def test_write_result_data_validates_scheduler_payload() -> None:
    ctx: dict[str, Any] = {"selected_skill_id": "scheduler"}
    client = MagicMock(spec=AsyncMock)
    valid = {
        "schedules": [
            {
                "dateTime": "2026-06-03T19:00:00",
                "type": "carousel",
                "promotedMenuItems": ["Nasi Goreng"],
                "visualIdea": "Kitchen prep and plated close-up",
                "captionIdea": "Dinner spotlight",
            }
        ],
        "campaignStart": "2026-06-01",
        "campaignEnd": "2026-06-30",
        "sourceSignalsSummary": "peak day hint: fri; high-demand weeks: 2",
    }

    with patch(
        "agents_app.agents.core.milestone_run.tools.write_result_data.upsert_milestonedata_node",
        new=AsyncMock(return_value={"id": "md-11"}),
    ) as mock_upsert:
        tools = _tools_for_context(ctx, client=client)
        write_result_data = _tool_by_name(tools, "write_result_data")
        out = await write_result_data.ainvoke({"new_data": valid})

    mock_upsert.assert_awaited_once()
    assert "md-11" in out
    assert isinstance(ctx.get("milestone_data"), dict)
    assert ctx["milestone_data"]["schedules"][0]["type"] == "carousel"
    assert ctx["milestone_data"]["campaignStart"] == "2026-06-01"


@pytest.mark.asyncio
async def test_write_result_data_rejects_invalid_scheduler_payload() -> None:
    ctx: dict[str, Any] = {"selected_skill_id": "scheduler"}
    client = MagicMock(spec=AsyncMock)
    invalid = {
        "schedules": [
            {
                "dateTime": "2026-06-03T19:00:00",
                "type": "video",
                "promotedMenuItems": ["Nasi Goreng"],
                "visualIdea": "Kitchen prep and plated close-up",
                "captionIdea": "Dinner spotlight",
            }
        ]
    }

    with patch(
        "agents_app.agents.core.milestone_run.tools.write_result_data.upsert_milestonedata_node",
        new=AsyncMock(return_value={"id": "md-12"}),
    ) as mock_upsert:
        tools = _tools_for_context(ctx, client=client)
        write_result_data = _tool_by_name(tools, "write_result_data")
        out = await write_result_data.ainvoke({"new_data": invalid})

    mock_upsert.assert_not_awaited()
    assert "Output validation failed for skill 'scheduler'" in out


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("selected_skill_id", "payload"),
    [
        (
            "public_holidays",
            {
                "startDate": "2026-06-01",
                "endDate": "2026-06-30",
                "publicHolidays": [
                    {
                        "name": "Hari Raya",
                        "description": "National holiday",
                        "date": "2026-06-17",
                    }
                ],
            },
        ),
        (
            "dates",
            {
                "startDate": "2026-06-01",
                "endDate": "2026-06-30",
                "publicHolidays": [],
            },
        ),
        (
            "brand_brief",
            {
                "venueSnapshot": {
                    "venueName": "Warung Maju",
                    "city": "Jakarta",
                    "country": "Indonesia",
                    "currency": "IDR",
                },
                "contentPillars": [
                    "Signature menu heroes",
                    "Category variety moments",
                    "Kitchen craft stories",
                ],
                "audienceHypotheses": [
                    "Office lunch audience",
                    "After-work dinner crowd",
                    "Weekend family groups",
                ],
                "proofOrientedAngles": [
                    "Top-selling dishes",
                    "Peak-day demand proof",
                    "Meal-period fit proof",
                ],
                "toneGuardrails": ["Warm", "Helpful", "Clear"],
            },
        ),
        (
            "promotion_candidates",
            {
                "placement": "grid",
                "puzzleOpportunityPool": {
                    "puzzleItemsFound": 2,
                    "threshold": 72.0,
                    "selectedCount": 1,
                },
                "promotionCandidates": [
                    {
                        "menu": "Nasi Goreng",
                        "rationale": ["High repeat orders"],
                        "instagramPromotion": {
                            "angle": "Chef spotlight",
                            "format": "carousel",
                            "cta": "Book now",
                            "timing": "Dinner",
                        },
                    }
                ],
                "rankedCandidates": [
                    {
                        "menu": "Nasi Goreng",
                        "recommendation": "promote",
                        "score": 94.2,
                        "quantity": 100,
                        "totalRevenue": 5000.0,
                        "signalReasons": ["Content hero"],
                        "extraSignal": "allowed",
                    }
                ],
                "context": {
                    "campaignWindowNotes": "Align with holiday week",
                    "brandBriefAlignmentNotes": "Fits warm tone",
                },
            },
        ),
        (
            "scheduler",
            {
                "schedules": [
                    {
                        "dateTime": "2026-06-03T19:00:00",
                        "type": "carousel",
                        "promotedMenuItems": ["Nasi Goreng"],
                        "visualIdea": "Kitchen prep and plated close-up",
                        "captionIdea": "Dinner spotlight",
                    }
                ]
            },
        ),
    ],
)
async def test_write_result_data_accepts_registered_skill_payloads(
    selected_skill_id: str, payload: dict[str, Any]
) -> None:
    ctx: dict[str, Any] = {"selected_skill_id": selected_skill_id}
    client = MagicMock(spec=AsyncMock)

    with patch(
        "agents_app.agents.core.milestone_run.tools.write_result_data.upsert_milestonedata_node",
        new=AsyncMock(return_value={"id": "md-registered-ok"}),
    ) as mock_upsert:
        tools = _tools_for_context(ctx, client=client)
        write_result_data = _tool_by_name(tools, "write_result_data")
        out = await write_result_data.ainvoke({"new_data": payload})

    mock_upsert.assert_awaited_once()
    awaited_payload = mock_upsert.await_args.args[2]
    assert "md-registered-ok" in out
    assert ctx.get("milestone_data") == awaited_payload
    assert isinstance(ctx.get("milestone_data"), dict)
    assert ctx.get("milestonedata_written") is True


@pytest.mark.asyncio
async def test_write_result_data_promotion_candidates_omits_optional_null_fields() -> None:
    ctx: dict[str, Any] = {"selected_skill_id": "promotion_candidates"}
    payload: dict[str, Any] = {
        "placement": "grid",
        "puzzleOpportunityPool": {
            "puzzleItemsFound": 2,
            "threshold": 72.0,
            "selectedCount": 1,
        },
        "promotionCandidates": [
            {
                "menu": "Nasi Goreng",
                "rationale": ["High repeat orders"],
            }
        ],
        "rankedCandidates": [
            {
                "menu": "Nasi Goreng",
                "recommendation": "promote",
                "score": 94.2,
                "quantity": 100,
                "totalRevenue": 5000.0,
                "signalReasons": ["Content hero"],
            }
        ],
    }
    client = MagicMock(spec=AsyncMock)

    with patch(
        "agents_app.agents.core.milestone_run.tools.write_result_data.upsert_milestonedata_node",
        new=AsyncMock(return_value={"id": "md-promo-no-nulls"}),
    ) as mock_upsert:
        tools = _tools_for_context(ctx, client=client)
        write_result_data = _tool_by_name(tools, "write_result_data")
        out = await write_result_data.ainvoke({"new_data": payload})

    mock_upsert.assert_awaited_once()
    awaited_payload = mock_upsert.await_args.args[2]
    assert "md-promo-no-nulls" in out
    assert "context" not in awaited_payload
    promoted = awaited_payload["promotionCandidates"][0]
    assert "puzzleAnalysis" not in promoted
    assert "instagramPromotion" not in promoted


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("selected_skill_id", "payload"),
    [
        (
            "public_holidays",
            {
                "startDate": "2026-06-01",
                "endDate": "2026-06-30",
                # invalid: description missing
                "publicHolidays": [{"name": "Hari Raya", "date": "2026-06-17"}],
            },
        ),
        (
            "brand_brief",
            {
                "venueSnapshot": {
                    "venueName": "Warung Maju",
                    "city": "Jakarta",
                    "country": "Indonesia",
                    # invalid: currency missing
                },
                "contentPillars": ["Signature menu"],
                "audienceHypotheses": ["Office workers"],
                "proofOrientedAngles": ["Best seller"],
                "toneGuardrails": ["Warm", "Helpful"],
            },
        ),
        (
            "promotion_candidates",
            {
                "placement": "grid",
                "puzzleOpportunityPool": {
                    "puzzleItemsFound": 2,
                    "threshold": 72.0,
                    # invalid: selectedCount missing
                },
                "promotionCandidates": [],
                "rankedCandidates": [],
            },
        ),
        (
            "scheduler",
            {
                "schedules": [
                    {
                        "dateTime": "2026-06-03T19:00:00",
                        # invalid literal
                        "type": "video",
                        "promotedMenuItems": ["Nasi Goreng"],
                        "visualIdea": "Kitchen prep and plated close-up",
                        "captionIdea": "Dinner spotlight",
                    }
                ]
            },
        ),
    ],
)
async def test_write_result_data_rejects_invalid_registered_skill_payloads(
    selected_skill_id: str, payload: dict[str, Any]
) -> None:
    ctx: dict[str, Any] = {"selected_skill_id": selected_skill_id}
    client = MagicMock(spec=AsyncMock)

    with patch(
        "agents_app.agents.core.milestone_run.tools.write_result_data.upsert_milestonedata_node",
        new=AsyncMock(return_value={"id": "md-registered-bad"}),
    ) as mock_upsert:
        tools = _tools_for_context(ctx, client=client)
        write_result_data = _tool_by_name(tools, "write_result_data")
        out = await write_result_data.ainvoke({"new_data": payload})

    mock_upsert.assert_not_awaited()
    assert f"Output validation failed for skill '{selected_skill_id}'" in out


@pytest.mark.asyncio
async def test_write_result_data_unknown_skill_passthrough() -> None:
    ctx: dict[str, Any] = {"selected_skill_id": "future_skill"}
    payload: dict[str, Any] = {"arbitrary": "shape", "nested": {"ok": True}}
    client = MagicMock(spec=AsyncMock)

    with patch(
        "agents_app.agents.core.milestone_run.tools.write_result_data.upsert_milestonedata_node",
        new=AsyncMock(return_value={"id": "md-unknown"}),
    ) as mock_upsert:
        tools = _tools_for_context(ctx, client=client)
        write_result_data = _tool_by_name(tools, "write_result_data")
        out = await write_result_data.ainvoke({"new_data": payload})

    mock_upsert.assert_awaited_once()
    awaited_payload = mock_upsert.await_args.args[2]
    assert awaited_payload == payload
    assert "md-unknown" in out


def test_fmt_milestone_brand_brief_owner_notes_empty() -> None:
    from agents_app.agents.core.milestone_run.tools.get_location_profile import (
        _fmt_milestone_brand_brief_owner_notes,
    )

    assert _fmt_milestone_brand_brief_owner_notes({}) == ""
    assert _fmt_milestone_brand_brief_owner_notes({"milestone_input": None}) == ""
    assert _fmt_milestone_brand_brief_owner_notes({"milestone_input": {"type": "dates"}}) == ""
    assert (
        _fmt_milestone_brand_brief_owner_notes(
            {"milestone_input": {"type": "restaurant_brand_brief", "value": {"notes": "   "}}}
        )
        == ""
    )


def test_fmt_milestone_brand_brief_owner_notes_includes_trimmed_text() -> None:
    from agents_app.agents.core.milestone_run.tools.get_location_profile import (
        _fmt_milestone_brand_brief_owner_notes,
    )

    md = _fmt_milestone_brand_brief_owner_notes(
        {
            "milestone_input": {
                "type": "restaurant_brand_brief",
                "value": {"notes": "  Family-friendly trattoria  "},
            },
        }
    )
    assert "Milestone brand brief input (owner)" in md
    assert "Family-friendly trattoria" in md
    assert "  Family-friendly" not in md


def test_validate_extra_tool_ids_rejects_unknown() -> None:
    from agents_app.agents.core.milestone_run.tools.registry import validate_extra_tool_ids

    with pytest.raises(ValueError, match="Unknown extra_tools"):
        validate_extra_tool_ids(["not_a_real_tool"])


def test_validate_extra_tool_ids_rejects_reserved() -> None:
    from agents_app.agents.core.milestone_run.tools.registry import validate_extra_tool_ids

    with pytest.raises(ValueError, match="reserved"):
        validate_extra_tool_ids(["read_goal"])
