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
    assert "read_prior_context_pack" not in names
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


def test_promotion_candidates_skill_extra_tool_ids() -> None:
    from agents_app.agents.core.milestone_run.skills import SKILL_REGISTRY

    pc = SKILL_REGISTRY["promotion_candidates"]
    assert pc.extra_tool_ids == ("get_promotion_candidates",)
    assert pc.inject_prior_presets == ("restaurant_campaign_brief",)


def test_post_scheduler_skill_tools_and_inject() -> None:
    from agents_app.agents.core.milestone_run.skills import SKILL_REGISTRY

    ps = SKILL_REGISTRY["post_scheduler"]
    assert ps.extra_tool_ids == ("get_available_dates",)
    assert ps.inject_prior_presets == ("restaurant_campaign_brief", "promotion_candidates")


def test_extra_tool_ids_includes_get_available_dates() -> None:
    tools = _tools_for_context({}, extra_tool_ids=["get_available_dates"])
    names = [getattr(t, "name", "") for t in tools]
    assert "get_available_dates" in names
    assert names.index("get_available_dates") < names.index("write_result_data")


def test_get_available_dates_lists_range_and_respects_filters() -> None:
    tools = _tools_for_context({}, extra_tool_ids=["get_available_dates"])
    fn = _tool_by_name(tools, "get_available_dates")
    out = fn.invoke(
        {
            "start_date": "2026-05-04",
            "end_date": "2026-05-06",
            "exclude_weekends": False,
            "exclude_holidays": False,
            "public_holiday_dates": None,
        }
    )
    assert "2026-05-04" in out
    assert "2026-05-05" in out
    assert "2026-05-06" in out

    out2 = fn.invoke(
        {
            "start_date": "2026-05-07",
            "end_date": "2026-05-10",
            "exclude_weekends": True,
            "exclude_holidays": False,
            "public_holiday_dates": None,
        }
    )
    assert "2026-05-07" in out2
    assert "2026-05-08" in out2
    assert "2026-05-09" not in out2
    assert "2026-05-10" not in out2

    out3 = fn.invoke(
        {
            "start_date": "2026-01-01",
            "end_date": "2026-01-03",
            "exclude_weekends": False,
            "exclude_holidays": True,
            "public_holiday_dates": ["2026-01-02"],
        }
    )
    assert "2026-01-01" in out3
    assert "2026-01-02" not in out3
    assert "2026-01-03" in out3


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
async def test_get_promotion_candidates_formats_engineering_payload() -> None:
    ctx: dict[str, Any] = {}
    client = MagicMock(spec=AsyncMock)
    grouped: dict[str, Any] = {
        "grouping": "by_menu_category",
        "rowsSkippedMissingCategory": 0,
        "categories": {
            "Mains": {
                "matrix": {"thresholds": {"avg_popularity": 1.0}, "distribution": [], "items": []},
                "topStars": [{"menu": "Sate", "quantity": 10}],
                "topPuzzles": [],
            }
        },
    }
    call_n = {"n": 0}

    async def fake_post(
        _client: Any,
        _query: str,
        _variables: dict[str, Any],
        _user_id: str,
    ) -> dict[str, Any]:
        call_n["n"] += 1
        if call_n["n"] == 1:
            return {"analyticsRuns": [{"id": "99", "name": "Latest"}]}
        return {"promotionEngineeringCandidates": grouped}

    with patch(
        "agents_app.agents.core.milestone_run.tools.get_promotion_candidates.graphql_post",
        new=AsyncMock(side_effect=fake_post),
    ):
        tools = _tools_for_context(ctx, client=client, extra_tool_ids=["get_promotion_candidates"])
        get_promotion_candidates = _tool_by_name(tools, "get_promotion_candidates")
        out = await get_promotion_candidates.ainvoke({})

    payload = json.loads(out)
    assert payload["analyticsRun"]["name"] == "Latest"
    pec = payload["promotionEngineeringCandidates"]
    assert pec["grouping"] == "by_menu_category"
    assert "Mains" in pec["categories"]
    assert pec["categories"]["Mains"]["topStars"][0]["menu"] == "Sate"
    assert "milestonePromotionCandidatesOwnerNotesMarkdown" not in payload


@pytest.mark.asyncio
async def test_get_promotion_candidates_includes_owner_notes_when_milestone_input_set() -> None:
    ctx: dict[str, Any] = {
        "milestone_input": {
            "type": "promotion_candidates",
            "value": {"notes": "  Highlight brunch  "},
        },
    }
    client = MagicMock(spec=AsyncMock)
    grouped: dict[str, Any] = {
        "grouping": "flat",
        "categories": {},
        "matrix": None,
        "topStars": [],
        "topPuzzles": [],
    }
    call_n = {"n": 0}

    async def fake_post(
        _client: Any,
        _query: str,
        _variables: dict[str, Any],
        _user_id: str,
    ) -> dict[str, Any]:
        call_n["n"] += 1
        if call_n["n"] == 1:
            return {"analyticsRuns": [{"id": "1", "name": "R"}]}
        return {"promotionEngineeringCandidates": grouped}

    with patch(
        "agents_app.agents.core.milestone_run.tools.get_promotion_candidates.graphql_post",
        new=AsyncMock(side_effect=fake_post),
    ):
        tools = _tools_for_context(ctx, client=client, extra_tool_ids=["get_promotion_candidates"])
        get_promotion_candidates = _tool_by_name(tools, "get_promotion_candidates")
        out = await get_promotion_candidates.ainvoke({})

    payload = json.loads(out)
    md = payload.get("milestonePromotionCandidatesOwnerNotesMarkdown")
    assert isinstance(md, str)
    assert "Highlight brunch" in md
    assert "Milestone promotion candidates input (owner)" in md


@pytest.mark.asyncio
async def test_get_promotion_candidates_no_analytics_run_message() -> None:
    ctx: dict[str, Any] = {}
    client = MagicMock(spec=AsyncMock)

    with patch(
        "agents_app.agents.core.milestone_run.tools.get_promotion_candidates.graphql_post",
        new=AsyncMock(return_value={"analyticsRuns": []}),
    ):
        tools = _tools_for_context(ctx, client=client, extra_tool_ids=["get_promotion_candidates"])
        get_promotion_candidates = _tool_by_name(tools, "get_promotion_candidates")
        out = await get_promotion_candidates.ainvoke({})

    assert "No analytics run" in out


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
            {"new_data": '{"startDate":"2026-06-01","endDate":"2026-06-30","publicHolidays":[]}'}
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
            "campaign_brief",
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
            "campaign_brief",
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


def test_fmt_milestone_campaign_brief_owner_notes_empty() -> None:
    from agents_app.agents.core.milestone_run.tools.get_location_profile import (
        _fmt_milestone_campaign_brief_owner_notes,
    )

    assert _fmt_milestone_campaign_brief_owner_notes({}) == ""
    assert _fmt_milestone_campaign_brief_owner_notes({"milestone_input": None}) == ""
    assert _fmt_milestone_campaign_brief_owner_notes({"milestone_input": {"type": "dates"}}) == ""
    assert (
        _fmt_milestone_campaign_brief_owner_notes(
            {"milestone_input": {"type": "restaurant_campaign_brief", "value": {"notes": "   "}}}
        )
        == ""
    )


def test_fmt_milestone_campaign_brief_owner_notes_includes_trimmed_text() -> None:
    from agents_app.agents.core.milestone_run.tools.get_location_profile import (
        _fmt_milestone_campaign_brief_owner_notes,
    )

    md = _fmt_milestone_campaign_brief_owner_notes(
        {
            "milestone_input": {
                "type": "restaurant_campaign_brief",
                "value": {"notes": "  Family-friendly trattoria  "},
            },
        }
    )
    assert "Milestone campaign_brief input (owner)" in md
    assert "Family-friendly trattoria" in md
    assert "  Family-friendly" not in md


def test_fmt_manual_brief_hints_empty_when_no_quick_profile() -> None:
    from agents_app.agents.core.milestone_run.tools.get_location_profile import (
        _fmt_manual_brief_hints,
    )

    assert _fmt_manual_brief_hints({}) == ""
    assert _fmt_manual_brief_hints({"manualBriefInput": None}) == ""
    assert _fmt_manual_brief_hints({"manualBriefInput": {"quickProfile": {}}}) == ""
    # Empty bucket-only fields should still produce no output.
    assert (
        _fmt_manual_brief_hints({"manualBriefInput": {"quickProfile": {"venueConcepts": []}}}) == ""
    )


def test_fmt_manual_brief_hints_renders_extended_profile_keys() -> None:
    from agents_app.agents.core.milestone_run.tools.get_location_profile import (
        _fmt_manual_brief_hints,
    )

    md = _fmt_manual_brief_hints(
        {
            "manualBriefInput": {
                "quickProfile": {
                    "venueConcepts": ["bistro"],
                    "cuisineTypes": ["italian", "indonesian"],
                    "serviceModes": ["dine_in", "delivery"],
                    "ambienceTags": ["cozy"],
                    "dietaryOptions": ["vegan", "halal"],
                    "postLanguages": ["de", "en"],
                    "priceTier": "mid",
                    "servesAlcohol": True,
                    "guestTags": ["office_lunch"],
                    "locationFocus": ["lunch"],
                    "socialGoals": ["walk_ins"],
                    "tonePresets": ["warm"],
                    "videoComfort": False,
                    "valueProposition": "Friendly Indonesian bistro for office lunches.",
                    "aboutStory": "Family-run since 2014.",
                    "topicsToAvoid": "No discount-led messaging on dinner posts.",
                    "instagramHandle": "menuyukti",
                    "websiteUrl": "https://menuyukti.example",
                    "reservationUrl": "https://book.example",
                    "phone": "+49 30 123",
                    "neighborhood": "Mitte",
                }
            }
        }
    )
    assert "Owner-provided brief hints" in md
    assert "Cuisine types**: italian, indonesian" in md
    assert "Service modes**: dine_in, delivery" in md
    assert "Ambience**: cozy" in md
    assert "Dietary options**: vegan, halal" in md
    assert "Post languages**: de, en" in md
    assert "Price tier**: mid" in md
    assert "Serves alcohol**: yes" in md
    assert "responsible-drinking" in md
    assert "Default social goals (overridable per campaign)**: walk_ins" in md
    assert "Hero promise**: Friendly Indonesian bistro for office lunches." in md
    assert "About / story**: Family-run since 2014." in md
    assert "Topics or visuals to avoid**: No discount-led" in md
    assert "Profile, contact & link-in-bio:" in md
    assert "Instagram handle**: @menuyukti" in md
    assert "Website**: https://menuyukti.example" in md
    assert "Reservation link**: https://book.example" in md
    assert "Phone**: +49 30 123" in md
    assert "Neighborhood**: Mitte" in md


def test_fmt_manual_brief_hints_handles_missing_optional_fields_gracefully() -> None:
    from agents_app.agents.core.milestone_run.tools.get_location_profile import (
        _fmt_manual_brief_hints,
    )

    md = _fmt_manual_brief_hints(
        {
            "manualBriefInput": {
                "quickProfile": {
                    "valueProposition": "Hero promise text",
                    "instagramHandle": "@example",
                }
            }
        }
    )
    assert "Hero promise**: Hero promise text" in md
    assert "Instagram handle**: @example" in md
    # No empty profile section header when only the IG handle is present.
    assert md.count("Profile, contact & link-in-bio:") == 1


def test_validate_extra_tool_ids_rejects_unknown() -> None:
    from agents_app.agents.core.milestone_run.tools.registry import validate_extra_tool_ids

    with pytest.raises(ValueError, match="Unknown extra_tools"):
        validate_extra_tool_ids(["not_a_real_tool"])


def test_validate_extra_tool_ids_rejects_reserved() -> None:
    from agents_app.agents.core.milestone_run.tools.registry import validate_extra_tool_ids

    with pytest.raises(ValueError, match="reserved"):
        validate_extra_tool_ids(["read_goal"])
