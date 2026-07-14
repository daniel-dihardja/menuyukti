"""Tests for dedicated IGPlan graph path and output schema."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.graph import build_milestone_run_graph
from agents_app.agents.core.milestone_run.ig_plan.nodes import (
    IgPlanDraftOutput,
    IgPlanEntryDraft,
    _trim_campaign_brief_for_prompt,
    fetch_and_prepare,
    generate_plan_with_llm,
    persist_result,
)
from agents_app.agents.core.milestone_run.ig_plan.prompts import (
    IG_PLAN_SYSTEM,
    build_ig_plan_messages,
    format_ig_plan_user_message,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from langchain_core.messages import HumanMessage, SystemMessage


async def _fake_eval_astream(*_a: object, **_k: object):
    yield (
        "values",
        {
            "evaluated": [{"id": "c1", "status": "pass"}],
            "result_summary": "S1",
            "result_node_id": "rn1",
        },
    )


def _minimal_initial() -> dict:
    return {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "workflow_id": None,
        "goal": "",
        "raw_data": "",
        "criteria": [],
        "prior_milestones_data": "",
        "preset_id": "",
        "result_data": "",
        "milestonedata_written": False,
        "result_summary": "",
        "result_node_id": None,
        "last_criteria_verdicts": [],
    }


def _slot_performance_fixture() -> dict:
    return {
        "sourceAnalyticsRunId": "42",
        "slots": [
            {
                "day": "monday",
                "mealPeriod": "lunch",
                "mealPeriodLabel": "Lunch",
                "mealPeriodHoursLabel": "11:00-14:00",
                "orderCount": 120,
                "demandIndex": 1.2,
                "relativeDemand": "high",
                "posture": "support",
            }
        ],
        "strongSlots": ["monday lunch"],
        "slotsNeedingPromotion": [],
        "summary": "Monday lunch is the strongest slot.",
    }


def _matrix_fixture() -> dict:
    return {
        "thresholds": {"avgPopularity": 0.5, "avgContributionMargin": 10.0},
        "distribution": [],
        "items": [
            {
                "menu": "Margherita Pizza",
                "category": "star",
                "action": "keep",
                "quantity": 100,
                "contributionMargin": 12.0,
                "weValue": 0.8,
            }
        ],
    }


def _slot_candidates_fixture() -> dict:
    return {
        "reportingPeriod": "2025-01-01 to 2025-03-31",
        "matrixAvailable": True,
        "coverageNotes": [],
        "slots": [
            {
                "day": "monday",
                "mealPeriod": "lunch",
                "mealPeriodLabel": "Lunch",
                "mealPeriodHoursLabel": "11:00-14:00",
                "orderCount": 120,
                "demandIndex": 1.2,
                "relativeDemand": "high",
                "posture": "support",
                "recommendedCategories": ["star", "plow_horse"],
                "totalItemQuantity": 400,
                "insufficientData": False,
                "candidates": [
                    {
                        "menu": "Margherita Pizza",
                        "globalCategory": "star",
                        "recommendedUse": "hero",
                        "rank": 1,
                        "score": 0.92,
                    }
                ],
            }
        ],
    }


def _valid_ig_plan_entry() -> dict:
    return {
        "day": "wednesday",
        "slot": "14:30",
        "objective": "Increase afternoon traffic",
        "pillar": "hero",
        "mealPeriod": "afternoon",
        "productRole": "puzzle",
        "slotStrategy": "aggressively_grow",
        "slotKey": "wednesday-afternoon",
    }


def _valid_ig_plan_payload() -> dict:
    return {
        "scheduleExplanation": (
            "Allocate hero pushes to weak afternoon and evening slots; use lighter "
            "reminder pillars on strong lunch periods."
        ),
        "entries": [_valid_ig_plan_entry()],
        "sourceAnalyticsRunId": "42",
        "reportingPeriod": "2025-01-01 to 2025-03-31",
    }


@pytest.mark.asyncio
async def test_routing_ig_plan_uses_dedicated_graph_path() -> None:
    client = MagicMock(spec=AsyncMock)
    mock_eval = MagicMock()
    mock_eval.astream = _fake_eval_astream
    payload = _valid_ig_plan_payload()

    captured_initial: dict[str, object] = {}

    async def _fake_ig_plan_astream(initial: dict[str, object], **_k: object):
        captured_initial.update(initial)
        yield (
            "values",
            {
                "result_data": payload["scheduleExplanation"],
                "milestone_data": payload,
                "milestonedata_written": True,
            },
        )

    with (
        patch(
            "agents_app.agents.core.milestone_run.graph.fetch_context",
            new=AsyncMock(
                return_value={
                    "goal": "G1",
                    "raw_data": "",
                    "criteria": [{"id": "c1", "requirement": "Must have entries"}],
                    "preset_id": "ig_plan",
                }
            ),
        ),
        patch(
            "agents_app.agents.core.milestone_eval.nodes.fetch_milestone_node",
            new=AsyncMock(
                return_value={
                    "data": {
                        "goal": "G1",
                        "passCriterias": [
                            {"id": "c1", "requirement": "Must have entries", "status": "open"}
                        ],
                    }
                }
            ),
        ),
        patch(
            "agents_app.agents.core.milestone_eval.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        patch(
            "agents_app.agents.core.milestone_run.graph.get_stream_writer",
            return_value=lambda _x: None,
        ),
        patch("agents_app.agents.core.milestone_run.graph.get_config", return_value={}),
        patch(
            "agents_app.agents.core.milestone_run.graph.build_milestone_eval_graph",
            return_value=mock_eval,
        ),
        patch("agents_app.agents.core.milestone_run.graph.build_ig_plan_graph") as mock_build,
        patch(
            "agents_app.agents.core.milestone_run.graph.fetch_prior_milestones_data",
            new=AsyncMock(return_value=_prior_milestones_json()),
        ),
    ):
        mock_graph = MagicMock()
        mock_graph.astream = _fake_ig_plan_astream
        mock_build.return_value = mock_graph
        graph = build_milestone_run_graph(client)
        await graph.ainvoke(
            {
                **_minimal_initial(),
                "preset_id": "ig_plan",
                "milestone_id": "m-ig-plan",
                "workflow_id": "wf-1",
            }
        )

    mock_build.assert_called_once()
    assert captured_initial.get("prior_milestones_data") == _prior_milestones_json()


def test_output_schema_valid_ig_plan_payload() -> None:
    normalized, error = validate_skill_output("ig_plan", _valid_ig_plan_payload())
    assert error is None
    assert isinstance(normalized, dict)
    assert normalized["scheduleExplanation"].startswith("Allocate hero pushes")
    assert len(normalized["entries"]) == 1
    assert normalized["entries"][0]["slotKey"] == "wednesday-afternoon"
    assert normalized["entries"][0]["slotStrategy"] == "aggressively_grow"


def test_output_schema_rejects_empty_schedule_explanation() -> None:
    payload = _valid_ig_plan_payload()
    payload["scheduleExplanation"] = "   "
    normalized, error = validate_skill_output("ig_plan", payload)
    assert normalized is None
    assert error is not None


def test_output_schema_rejects_empty_entries() -> None:
    payload = _valid_ig_plan_payload()
    payload["entries"] = []
    normalized, error = validate_skill_output("ig_plan", payload)
    assert normalized is None
    assert error is not None


def test_output_schema_rejects_invalid_slot_time() -> None:
    payload = _valid_ig_plan_payload()
    payload["entries"][0]["slot"] = "9:30"
    normalized, error = validate_skill_output("ig_plan", payload)
    assert normalized is None
    assert error is not None


def test_output_schema_rejects_invalid_day() -> None:
    payload = _valid_ig_plan_payload()
    payload["entries"][0]["day"] = "mon"
    normalized, error = validate_skill_output("ig_plan", payload)
    assert normalized is None
    assert error is not None


def test_output_schema_rejects_missing_reporting_period() -> None:
    payload = _valid_ig_plan_payload()
    payload["reportingPeriod"] = ""
    normalized, error = validate_skill_output("ig_plan", payload)
    assert normalized is None
    assert error is not None


def _campaign_brief_data() -> dict:
    return {
        "venueSnapshot": {
            "venueName": "Cafe Alto",
            "city": "Berlin",
            "country": "Germany",
            "currency": "EUR",
        },
        "overallStrategy": {
            "strategyFocus": "weekday_lunch",
            "audiencePriority": ["Weekday lunch nearby workers"],
            "coreMessage": "Promote weekday lunch for nearby workers.",
            "offerWindow": "11:00-14:00",
            "cadenceGuidance": ["Publish lunch-focused content on Tuesday."],
        },
        "contentPillars": ["Hero signatures", "Category variety"],
        "audienceHypotheses": ["Lunch nearby workers"],
        "proofOrientedAngles": ["Top sellers lead conversions"],
        "toneGuardrails": ["Be specific"],
        "campaignObjective": "Increase weekday lunch visits",
        "mainCategory": "Mains",
        "targetSegments": ["Weekday lunch workers"],
        "messageHierarchy": ["Hero promise"],
        "offerAndCtaPlan": ["Keep offers margin-safe"],
        "contentPillarPlan": ["Signature dishes via Reels"],
        "measurementPlan": ["Track saves weekly"],
        "testingPlan": ["Test lunch windows"],
        "riskGuardrails": ["Avoid unverified claims"],
    }


def _prior_milestones_json() -> str:
    return json.dumps(
        [
            {
                "title": "Campaign brief",
                "presetId": "restaurant_campaign_brief",
                "data": _campaign_brief_data(),
            }
        ]
    )


def _ig_plan_fetch_fixture() -> dict:
    return {
        "analyticsRunId": "42",
        "locationRaw": {
            "id": "1",
            "name": "Trattoria Roma",
            "street": "Via Roma 1",
            "city": "Milan",
            "country": "IT",
            "currency": "EUR",
            "openingHours": [
                {
                    "dayOfWeek": "monday",
                    "openTime": "11:00",
                    "closeTime": "22:00",
                },
                {
                    "dayOfWeek": "tuesday",
                    "openTime": "11:00",
                    "closeTime": "22:00",
                },
            ],
            "manualBriefInput": {
                "locationId": 1,
                "quickProfile": {
                    "cuisineTypes": ["Italian"],
                    "tonePresets": ["warm", "inviting"],
                    "valueProposition": "Authentic Roman pasta in the city center.",
                },
            },
        },
        "slotPerformance": _slot_performance_fixture(),
        "menuEngineeringMatrix": _matrix_fixture(),
        "slotMenuCandidates": _slot_candidates_fixture(),
        "coverageNotes": [],
    }


@pytest.mark.asyncio
async def test_fetch_and_prepare_requires_prior_campaign_brief() -> None:
    client = MagicMock(spec=AsyncMock)
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "Weekly IG plan",
        "criteria": [],
        "prior_milestones_data": "",
        "result_data": "",
        "milestonedata_written": False,
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.ig_plan.nodes.get_stream_writer",
            return_value=lambda _payload: None,
        ),
        pytest.raises(ValueError, match="restaurant_campaign_brief"),
    ):
        await fetch_and_prepare(state, client=client)


@pytest.mark.asyncio
async def test_fetch_and_prepare_builds_generation_context() -> None:
    client = MagicMock(spec=AsyncMock)
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "Weekly IG plan",
        "criteria": [],
        "prior_milestones_data": _prior_milestones_json(),
        "milestone_input": {"type": "ig_plan", "value": {"notes": "focus lunch"}},
        "result_data": "",
        "milestonedata_written": False,
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.ig_plan.nodes.fetch_ig_plan_inputs",
            new_callable=AsyncMock,
            return_value=_ig_plan_fetch_fixture(),
        ),
        patch(
            "agents_app.agents.core.milestone_run.ig_plan.nodes.get_stream_writer",
            return_value=lambda _payload: None,
        ),
    ):
        out = await fetch_and_prepare(state, client=client)

    assert out["analytics_run_id"] == "42"
    assert isinstance(out.get("campaign_brief_data"), dict)
    assert out["campaign_brief_data"]["campaignObjective"] == "Increase weekday lunch visits"
    context = str(out.get("generation_context_json") or "")
    assert "## Goal" in context
    assert "## Owner notes" in context
    assert "## Campaign brief" in context
    assert "## Analytics inputs" in context
    assert "Weekly IG plan" in context
    assert "focus lunch" in context
    assert "campaignObjective" in context
    assert "Increase weekday lunch visits" in context
    assert "locationProfile" in context
    assert "Trattoria Roma" in context
    assert "Italian" in context
    assert "slotPerformance" in context
    assert "menuEngineeringMatrix" in context
    assert "slotMenuCandidates" not in context
    assert "openingHours" in context
    assert '"openTime": "11:00"' in context
    assert "structured JSON" in context
    assert "measurementPlan" not in context
    assert "testingPlan" not in context


def test_trim_campaign_brief_excludes_operational_fields() -> None:
    trimmed = _trim_campaign_brief_for_prompt(_campaign_brief_data())
    assert trimmed["campaignObjective"] == "Increase weekday lunch visits"
    assert "measurementPlan" not in trimmed
    assert "testingPlan" not in trimmed
    assert "messageHierarchy" not in trimmed


def test_ig_plan_user_message_includes_sections() -> None:
    payload = {
        "goal": "Weekly plan",
        "ownerNotes": "focus lunch",
        "campaignBrief": _trim_campaign_brief_for_prompt(_campaign_brief_data()),
        "locationProfile": {"identity": {"name": "Trattoria Roma"}},
        "slotPerformance": {"slots": []},
        "menuEngineeringMatrix": {"distribution": []},
    }
    message = format_ig_plan_user_message(
        goal="Weekly plan",
        owner_notes="focus lunch",
        context_payload=payload,
    )
    assert "## Goal" in message
    assert "## Owner notes" in message
    assert "## Campaign brief" in message
    assert "## Analytics inputs" in message
    assert "Weekly plan" in message
    assert "focus lunch" in message
    assert "campaignObjective" in message
    assert "locationProfile" in message
    assert "Trattoria Roma" in message


def test_build_ig_plan_messages_shape() -> None:
    payload = {
        "goal": None,
        "ownerNotes": None,
        "campaignBrief": _trim_campaign_brief_for_prompt(_campaign_brief_data()),
        "slotPerformance": {},
    }
    messages = build_ig_plan_messages(
        goal="G1",
        owner_notes="notes",
        context_payload=payload,
    )
    assert len(messages) == 2
    assert isinstance(messages[0], SystemMessage)
    assert messages[0].content == IG_PLAN_SYSTEM
    assert isinstance(messages[1], HumanMessage)
    human = str(messages[1].content)
    assert "## Goal" in human
    assert "G1" in human
    assert "## Campaign brief" in human
    assert "campaignObjective" in human


def test_ig_plan_system_is_strategy_only() -> None:
    system = IG_PLAN_SYSTEM
    assert "slot strategy grid" in system
    assert "marketing opportunity" in system
    assert "campaignBrief" in system
    assert "SOURCE PRECEDENCE" in system
    for field in (
        "objective",
        "pillar",
        "mealPeriod",
        "productRole",
        "slotStrategy",
        "slotKey",
    ):
        assert field in system
    for strategy in ("maintain", "support", "grow", "aggressively_grow"):
        assert strategy in system
    for pillar in ("lifestyle", "community", "social_proof", "educational", "product_discovery"):
        assert pillar in system
    assert "openingHours" in system
    assert "Do not include dish names" in system
    assert "Product Selection node" in system
    for removed in (
        "Instagram format guide",
        "formatRationale",
        "hookIdea",
        "companionStory",
        "planMarkdown",
        "slotMenuCandidates",
    ):
        assert removed not in system


def test_ig_plan_empty_owner_notes_renders_placeholder() -> None:
    message = format_ig_plan_user_message(
        goal="",
        owner_notes="",
        context_payload={"slotPerformance": {}},
    )
    assert "## Owner notes" in message
    assert "(none)" in message
    assert "(not provided)" in message


@pytest.mark.asyncio
async def test_generate_plan_returns_structured_payload() -> None:
    draft = IgPlanDraftOutput(
        scheduleExplanation="Push weak afternoon slots with hero puzzle discovery.",
        entries=[
            IgPlanEntryDraft(
                day="wednesday",
                slot="14:30",
                objective="Increase afternoon traffic",
                pillar="hero",
                mealPeriod="afternoon",
                productRole="puzzle",
                slotStrategy="aggressively_grow",
                slotKey="wednesday-afternoon",
            )
        ],
    )
    state = {
        "goal": "Weekly IG plan",
        "milestone_input": {"type": "ig_plan", "value": {"notes": "focus lunch"}},
        "campaign_brief_data": _campaign_brief_data(),
        "slot_menu_candidates": _slot_candidates_fixture(),
        "analytics_run_id": "42",
        "location_profile": {"identity": {"name": "Trattoria Roma"}},
        "slot_performance": _slot_performance_fixture(),
        "menu_engineering_matrix": _matrix_fixture(),
        "generation_context_json": "{}",
        "result_data": "",
        "milestonedata_written": False,
    }

    with (
        patch(
            "agents_app.agents.core.milestone_run.ig_plan.nodes.structured_ainvoke_from_run_config",
            new_callable=AsyncMock,
            return_value=draft,
        ),
        patch(
            "agents_app.agents.core.milestone_run.ig_plan.nodes.get_stream_writer",
            return_value=lambda _payload: None,
        ),
    ):
        out = await generate_plan_with_llm(state)  # type: ignore[arg-type]

    generated = out["generated_output"]
    assert generated["scheduleExplanation"] == draft.scheduleExplanation
    assert generated["entries"][0]["slotKey"] == "wednesday-afternoon"
    assert generated["entries"][0]["slotStrategy"] == "aggressively_grow"
    assert generated["sourceAnalyticsRunId"] == "42"
    assert generated["reportingPeriod"] == "2025-01-01 to 2025-03-31"


@pytest.mark.asyncio
async def test_persist_result_uses_json_raw_data_for_eval() -> None:
    payload = _valid_ig_plan_payload()
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "generated_output": payload,
        "location_profile": {
            "openingHours": [
                {"dayOfWeek": "wednesday", "openTime": "11:00", "closeTime": "22:00"},
            ],
        },
        "slot_performance": {
            "slots": [
                {
                    "day": "wednesday",
                    "mealPeriod": "afternoon",
                    "relativeDemand": "low",
                }
            ]
        },
        "result_data": "",
        "milestonedata_written": False,
    }
    with patch(
        "agents_app.agents.core.milestone_run.ig_plan.nodes.upsert_milestonedata_node",
        new_callable=AsyncMock,
    ) as mock_upsert:
        out = await persist_result(state, client=MagicMock(spec=AsyncMock))  # type: ignore[arg-type]

    mock_upsert.assert_awaited_once()
    assert "weekly slot entries." in out["result_data"]
    assert '"entries"' in out["raw_data"]
    assert '"slotKey": "wednesday-afternoon"' in out["raw_data"]
    assert '"_evalHints"' in out["raw_data"]
    assert out["raw_data"] != out["result_data"]


def test_normalize_sorts_entries_by_day() -> None:
    from agents_app.agents.core.milestone_run.ig_plan.nodes import _normalize_generated_output

    payload = {
        "scheduleExplanation": "Weekly allocation across weak and strong slots.",
        "entries": [
            {
                "day": "friday",
                "slot": "12:00",
                "objective": "Friday lunch",
                "pillar": "hero",
                "mealPeriod": "lunch",
                "productRole": "star",
                "slotStrategy": "support",
                "slotKey": "friday-lunch",
            },
            {
                "day": "monday",
                "slot": "11:30",
                "objective": "Monday lunch",
                "pillar": "reminder",
                "mealPeriod": "lunch",
                "productRole": "star",
                "slotStrategy": "maintain",
                "slotKey": "monday-lunch",
            },
        ],
        "sourceAnalyticsRunId": "42",
        "reportingPeriod": "2025-01-01 to 2025-03-31",
    }
    normalized = _normalize_generated_output(payload)
    assert normalized["entries"][0]["day"] == "monday"
    assert normalized["entries"][1]["day"] == "friday"


def test_resolve_eval_raw_data_prefers_structured_json() -> None:
    from agents_app.agents.core.milestone_run.graph import _resolve_eval_raw_data

    payload = _valid_ig_plan_payload()
    resolved = _resolve_eval_raw_data(
        {
            "milestone_id": "m1",
            "location_id": 1,
            "user_id": "u1",
            "workflow_id": None,
            "goal": "",
            "raw_data": "",
            "milestone_data": payload,
            "criteria": [],
            "prior_milestones_data": "",
            "preset_id": "ig_plan",
            "result_data": "Narrative summary only.",
            "milestonedata_written": True,
            "result_summary": "",
            "result_node_id": None,
            "last_criteria_verdicts": [],
        }
    )
    parsed = json.loads(resolved)
    assert isinstance(parsed.get("entries"), list)
    assert parsed["entries"][0]["slotKey"] == "wednesday-afternoon"
