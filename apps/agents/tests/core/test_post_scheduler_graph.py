"""Tests for dedicated post-scheduler graph path and output schema."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.graph import build_milestone_run_graph
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output
from agents_app.agents.core.milestone_run.post_scheduler.nodes import (
    fetch_and_prepare,
    generate_campaign_concepts,
    persist_result,
)


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


def _valid_post_scheduler_payload() -> dict:
    return {
        "monthlyArc": {
            "weeks": [
                {"week": 1, "objective": "Awareness", "rationale": "Kickoff reach."},
                {"week": 2, "objective": "Consideration", "rationale": "Build saves."},
                {"week": 3, "objective": "Conversion", "rationale": "Drive reservations."},
                {"week": 4, "objective": "Loyalty", "rationale": "Retain regulars."},
            ]
        },
        "contentRatio": {
            "pillars": [
                {"pillar": "Signature dishes", "percent": 40, "reason": "Appetite anchor."},
                {"pillar": "Social proof", "percent": 30, "reason": "Trust builder."},
                {"pillar": "Community", "percent": 30, "reason": "Retention."},
            ]
        },
        "formatMix": {
            "formats": [
                {"format": "Reels", "count": 8, "reason": "Discovery"},
                {"format": "Carousels", "count": 4, "reason": "Education"},
                {"format": "Single posts", "count": 4, "reason": "Promotions"},
                {"format": "Stories", "count": 30, "reason": "Daily touchpoints"},
                {"format": "Highlights updates", "count": 2, "reason": "Profile hygiene"},
                {"format": "Lives", "count": 1, "reason": "Real-time trust"},
                {"format": "Collaborator posts", "count": 2, "reason": "Partner reach"},
            ]
        },
        "weeklySlotPlan": [
            {
                "week": 1,
                "day": "Monday",
                "format": "Reel",
                "pillar": "Signature dishes",
                "hook": "Steam reveal in first second.",
                "captionStructure": "Hook -> Context -> Proof -> CTA summary",
                "ctaType": "Save",
                "funnelStage": "Awareness",
                "visualDirection": "Natural-light kitchen hero shot.",
                "notes": "Lunch posting window.",
            },
            {
                "week": 2,
                "day": "Tuesday",
                "format": "Carousel",
                "pillar": "Social proof",
                "hook": "Customer quote card first.",
                "captionStructure": "Hook -> Context -> Proof -> CTA summary",
                "ctaType": "Save",
                "funnelStage": "Consideration",
                "visualDirection": "UGC + plated detail closeups.",
                "notes": "Save-oriented educational post.",
            },
            {
                "week": 3,
                "day": "Wednesday",
                "format": "Single post",
                "pillar": "Signature dishes",
                "hook": "Limited-time offer frame.",
                "captionStructure": "Hook -> Context -> Proof -> CTA summary",
                "ctaType": "Save",
                "funnelStage": "Conversion",
                "visualDirection": "Counter pickup moment.",
                "notes": "Promo placement.",
            },
            {
                "week": 4,
                "day": "Thursday",
                "format": "Carousel",
                "pillar": "Community",
                "hook": "Community board opener.",
                "captionStructure": "Hook -> Context -> Proof -> CTA summary",
                "ctaType": "DM",
                "funnelStage": "Loyalty",
                "visualDirection": "Guest stories and staff portraits.",
                "notes": "Community-led closeout.",
            },
        ],
        "guardrailCheck": "All guardrails satisfied.",
    }


@pytest.mark.asyncio
async def test_routing_post_scheduler_uses_dedicated_graph_path() -> None:
    client = MagicMock(spec=AsyncMock)
    mock_eval = MagicMock()
    mock_eval.astream = _fake_eval_astream

    async def _fake_post_scheduler_astream(*_a: object, **_k: object):
        yield (
            "values",
            {
                "result_data": '{"monthlyArc":{"weeks":[{"week":1,"objective":"Awareness","rationale":"Kickoff"}]},"contentRatio":{"pillars":[]},"formatMix":{"formats":[]},"weeklySlotPlan":[],"guardrailCheck":"ok"}',
                "milestone_data": _valid_post_scheduler_payload(),
                "milestonedata_written": True,
            },
        )

    with (
        patch(
            "agents_app.agents.core.milestone_run.graph.fetch_milestone_node",
            new=AsyncMock(return_value={"data": {"goal": "G1", "presetId": "post_scheduler"}}),
        ),
        patch(
            "agents_app.agents.core.milestone_eval.nodes.fetch_milestone_node",
            new=AsyncMock(
                return_value={
                    "data": {
                        "goal": "G1",
                        "passCriterias": [{"id": "c1", "requirement": "Must have data", "status": "open"}],
                    }
                }
            ),
        ),
        patch("agents_app.agents.core.milestone_eval.nodes.get_stream_writer", return_value=lambda _x: None),
        patch("agents_app.agents.core.milestone_run.graph.get_stream_writer", return_value=lambda _x: None),
        patch("agents_app.agents.core.milestone_run.graph.get_config", return_value={}),
        patch("agents_app.agents.core.milestone_run.graph.build_milestone_eval_graph", return_value=mock_eval),
        patch("agents_app.agents.core.milestone_run.graph.build_post_scheduler_graph") as mock_build_post,
    ):
        mock_post_graph = MagicMock()
        mock_post_graph.astream = _fake_post_scheduler_astream
        mock_build_post.return_value = mock_post_graph
        graph = build_milestone_run_graph(client)
        out = await graph.ainvoke(_minimal_initial())

    mock_build_post.assert_called_once()
    assert out.get("milestonedata_written") is True


def test_output_schema_valid_post_scheduler_payload() -> None:
    payload = _valid_post_scheduler_payload()
    normalized, error = validate_skill_output("post_scheduler", payload)
    assert error is None
    assert isinstance(normalized, dict)
    assert len(normalized["monthlyArc"]["weeks"]) == 4
    assert normalized["contentRatio"]["pillars"][0]["percent"] == 40
    assert normalized["weeklySlotPlan"][0]["format"] == "Reel"


def test_output_schema_rejects_invalid_weekly_slot_shape() -> None:
    payload = {
        **_valid_post_scheduler_payload(),
        "weeklySlotPlan": [{"week": "1"}],
    }
    normalized, error = validate_skill_output("post_scheduler", payload)
    assert normalized is None
    assert error is not None


@pytest.mark.asyncio
async def test_generate_campaign_concepts_returns_new_shape() -> None:
    state = {
        "goal": "Grow weekday lunches",
        "criteria": [],
        "generation_context_markdown": "Context",
        "scheduler_plan": {"campaignStart": "2026-06-01", "campaignEnd": "2026-06-30"},
    }
    with patch(
        "agents_app.agents.core.milestone_run.post_scheduler.nodes.structured_llm_from_milestone_run_config",
    ) as mock_get_llm, patch(
        "agents_app.agents.core.milestone_run.post_scheduler.nodes.get_stream_writer",
        return_value=lambda _x: None,
    ):
        mock_llm = MagicMock()
        mock_structured = MagicMock()
        mock_structured.ainvoke = AsyncMock(
            return_value=MagicMock(
                model_dump=MagicMock(
                    return_value={
                        **_valid_post_scheduler_payload(),
                    }
                )
            )
        )
        mock_llm.with_structured_output.return_value = mock_structured
        mock_get_llm.return_value = mock_llm
        out = await generate_campaign_concepts(state)  # type: ignore[arg-type]
    assert len(out["generated_output"]["monthlyArc"]["weeks"]) == 4
    assert isinstance(out["generated_output"]["weeklySlotPlan"], list)


@pytest.mark.asyncio
async def test_fetch_and_prepare_handles_scheduler_plan_graphql_error() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "workflow_id": "wf-1",
        "goal": "Build post schedule",
        "criteria": [],
        "milestone_input": None,
        "injected_prior_context_markdown": "",
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.post_scheduler.nodes.fetch_campaign_schedule_plan",
            new=AsyncMock(
                side_effect=RuntimeError(
                    "'NoneType' object has no attribute 'get'; path=['campaignSchedulePlan']; code=INTERNAL_SERVER_ERROR"
                )
            ),
        ),
        patch(
            "agents_app.agents.core.milestone_run.post_scheduler.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
    ):
        out = await fetch_and_prepare(state, client=MagicMock(spec=AsyncMock))
    assert out["scheduler_plan"] is None
    assert "Scheduler plan unavailable" in out["generation_context_markdown"]


@pytest.mark.asyncio
async def test_persist_result_filters_menu_items_to_prefetched_promotion_candidates() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "generated_output": _valid_post_scheduler_payload(),
    }
    with patch(
        "agents_app.agents.core.milestone_run.post_scheduler.nodes.upsert_milestonedata_node",
        new=AsyncMock(return_value={"id": "md-1"}),
    ) as mock_upsert:
        out = await persist_result(state, client=MagicMock(spec=AsyncMock))

    assert "monthlyArc" in out["result_data"]
    saved_payload = mock_upsert.await_args.args[2]
    assert saved_payload["weeklySlotPlan"][0]["ctaType"] == "Save"
