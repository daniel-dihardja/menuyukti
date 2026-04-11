"""Tests for milestone run SSE stream adapter."""

from __future__ import annotations

import json
import re
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.stream import iter_milestone_run_sse_lines


def _parse_sse_data_lines(lines: list[str]) -> list[dict]:
    out: list[dict] = []
    for line in lines:
        for block in line.strip().split("\n\n"):
            m = re.match(r"^data: (.+)$", block.strip(), flags=re.MULTILINE)
            if not m:
                continue
            try:
                out.append(json.loads(m.group(1)))
            except json.JSONDecodeError:
                continue
    return out


@pytest.mark.asyncio
async def test_iter_milestone_run_sse_lines_yields_done_payload() -> None:
    captured: dict = {}

    async def fake_astream(initial: object, *args: object, **kwargs: object):
        captured["initial"] = initial
        captured["config"] = kwargs.get("config")
        yield (
            "values",
            {
                "result_node_id": "node-99",
                "result_summary": "All good",
                "last_criteria_verdicts": [{"id": "c1", "status": "pass"}],
                "milestonedata_written": False,
            },
        )

    mock_graph = MagicMock()
    mock_graph.astream = fake_astream

    with (
        patch(
            "agents_app.agents.core.milestone_run.stream.build_milestone_run_graph",
            return_value=mock_graph,
        ),
        patch(
            "agents_app.agents.core.milestone_run.stream.start_milestone_agent_run_record",
            new=AsyncMock(return_value=True),
        ),
        patch(
            "agents_app.agents.core.milestone_run.stream.complete_milestone_agent_run_record",
            new=AsyncMock(),
        ) as mock_complete,
    ):
        lines: list[str] = []
        async for line in iter_milestone_run_sse_lines(
            client=MagicMock(spec=AsyncMock),
            milestone_id="m1",
            location_id=2,
            user_id="u1",
        ):
            lines.append(line)

    mock_complete.assert_awaited_once()
    assert mock_complete.await_args is not None
    assert mock_complete.await_args.kwargs.get("status") == "success"

    payloads = _parse_sse_data_lines(lines)
    assert len(payloads) == 2
    assert "run_id" in payloads[0] and len(str(payloads[0]["run_id"])) > 0
    rid = str(payloads[0]["run_id"])
    done = payloads[1]
    assert done.get("done") is True
    assert done.get("run_id") == rid
    assert done.get("resultId") == "node-99"
    assert done.get("summary") == "All good"
    assert any(c.get("id") == "c1" and c.get("status") == "pass" for c in (done.get("criteria") or []))
    assert "dataPreview" not in done

    init = captured["initial"]
    assert isinstance(init, dict)
    assert init.get("run_id") == rid
    assert init.get("milestone_id") == "m1"
    assert init.get("api_adapter_tools") == []
    cfg = captured.get("config")
    assert isinstance(cfg, dict)
    assert cfg["metadata"]["run_id"] == rid
    assert cfg["metadata"]["milestone_id"] == "m1"


@pytest.mark.asyncio
async def test_iter_milestone_run_sse_done_includes_data_preview_when_milestonedata_written() -> None:
    async def fake_astream(*_a: object, **_k: object):
        yield (
            "values",
            {
                "result_node_id": "node-99",
                "result_summary": "Done",
                "result_data": "## Updated\n\nBody",
                "milestonedata_written": True,
                "last_criteria_verdicts": [],
            },
        )

    mock_graph = MagicMock()
    mock_graph.astream = fake_astream

    with (
        patch(
            "agents_app.agents.core.milestone_run.stream.build_milestone_run_graph",
            return_value=mock_graph,
        ),
        patch(
            "agents_app.agents.core.milestone_run.stream.start_milestone_agent_run_record",
            new=AsyncMock(return_value=True),
        ),
        patch(
            "agents_app.agents.core.milestone_run.stream.complete_milestone_agent_run_record",
            new=AsyncMock(),
        ),
    ):
        lines: list[str] = []
        async for line in iter_milestone_run_sse_lines(
            client=MagicMock(spec=AsyncMock),
            milestone_id="m1",
            location_id=2,
            user_id="u1",
        ):
            lines.append(line)

    payloads = _parse_sse_data_lines(lines)
    assert len(payloads) == 2
    done = payloads[1]
    assert done.get("dataPreview") == "## Updated\n\nBody"
