"""Tests for dedicated IG profile graph path and output schema."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.graph import build_milestone_run_graph
from agents_app.agents.core.milestone_run.ig_profile.nodes import (
    fetch_and_prepare,
    generate_profile,
)
from agents_app.agents.core.milestone_run.output_schema import validate_skill_output


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


def _valid_ig_profile_payload() -> dict:
    bio = {
        "text": "Modern bistro in Berlin. Seasonal plates, warm vibes. Reserve your table.",
        "hook": "Opens with venue type and city.",
        "valueProp": "Promises seasonal food and atmosphere.",
        "cta": "Drives table reservations.",
        "tone": "Warm and contemporary per brief guardrails.",
    }
    return {
        "usernames": [
            {"username": "bistro.berlin", "rationale": "Short venue + city handle."},
            {"username": "eat_at_bistro", "rationale": "Action-oriented and memorable."},
            {"username": "bistro_kitchen", "rationale": "Highlights food identity."},
        ],
        "bios": [
            bio,
            {
                **bio,
                "text": "Berlin bistro. Seasonal kitchen. Book a table tonight.",
                "hook": "Leads with city and format.",
            },
            {
                **bio,
                "text": "Seasonal plates & warm vibes in Berlin. Reserve now.",
                "hook": "Leads with food promise.",
            },
        ],
    }


@pytest.mark.asyncio
async def test_routing_ig_profile_uses_dedicated_graph_path() -> None:
    client = MagicMock(spec=AsyncMock)
    mock_eval = MagicMock()
    mock_eval.astream = _fake_eval_astream

    async def _fake_ig_profile_astream(*_a: object, **_k: object):
        yield (
            "values",
            {
                "result_data": '{"usernames":[]}',
                "milestone_data": _valid_ig_profile_payload(),
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
                    "criteria": [{"id": "c1", "requirement": "Must have usernames"}],
                    "preset_id": "ig_profile",
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
                            {"id": "c1", "requirement": "Must have usernames", "status": "open"}
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
        patch("agents_app.agents.core.milestone_run.graph.build_ig_profile_graph") as mock_build,
    ):
        mock_graph = MagicMock()
        mock_graph.astream = _fake_ig_profile_astream
        mock_build.return_value = mock_graph
        graph = build_milestone_run_graph(client)
        out = await graph.ainvoke(_minimal_initial())

    mock_build.assert_called_once()
    assert out.get("milestonedata_written") is True


def test_output_schema_valid_ig_profile_payload() -> None:
    normalized, error = validate_skill_output("ig_profile", _valid_ig_profile_payload())
    assert error is None
    assert isinstance(normalized, dict)
    assert len(normalized["usernames"]) == 3


def test_output_schema_rejects_invalid_username() -> None:
    payload = _valid_ig_profile_payload()
    payload["usernames"][0]["username"] = "invalid handle!"
    normalized, error = validate_skill_output("ig_profile", payload)
    assert normalized is None
    assert error is not None


def test_output_schema_rejects_wrong_bio_count() -> None:
    payload = _valid_ig_profile_payload()
    payload["bios"] = payload["bios"][:2]
    normalized, error = validate_skill_output("ig_profile", payload)
    assert normalized is None
    assert error is not None


def test_output_schema_clamps_bio_over_150_chars() -> None:
    payload = _valid_ig_profile_payload()
    payload["bios"][2]["text"] = "x" * 151
    normalized, error = validate_skill_output("ig_profile", payload)
    assert error is None
    assert isinstance(normalized, dict)
    assert len(normalized["bios"][2]["text"]) <= 150
    assert normalized["bios"][2]["text"]


@pytest.mark.asyncio
async def test_generate_profile_returns_new_shape() -> None:
    state = {
        "goal": "Suggest IG profile",
        "criteria": [],
        "generation_context_markdown": "Context from campaign brief",
    }
    draft = MagicMock()
    draft.model_dump = MagicMock(return_value=_valid_ig_profile_payload())
    with (
        patch(
            "agents_app.agents.core.milestone_run.ig_profile.nodes.structured_ainvoke_from_run_config",
            new=AsyncMock(return_value=draft),
        ),
        patch(
            "agents_app.agents.core.milestone_run.ig_profile.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
    ):
        out = await generate_profile(state)  # type: ignore[arg-type]
    assert out["generated_output"]["bios"][0]["text"]
    assert len(out["generated_output"]["bios"]) == 3


@pytest.mark.asyncio
async def test_fetch_and_prepare_requires_prior_campaign_brief() -> None:
    state = {
        "milestone_id": "m1",
        "location_id": 1,
        "user_id": "u1",
        "goal": "Suggest profile",
        "criteria": [],
        "injected_prior_context_markdown": "",
        "milestone_input": {"type": "ig_profile", "value": {"notes": ""}},
    }
    with (
        patch(
            "agents_app.agents.core.milestone_run.ig_profile.nodes.get_stream_writer",
            return_value=lambda _x: None,
        ),
        pytest.raises(
            ValueError, match="ig_profile requires a prior restaurant_campaign_brief milestone"
        ),
    ):
        await fetch_and_prepare(state, client=MagicMock(spec=AsyncMock))
