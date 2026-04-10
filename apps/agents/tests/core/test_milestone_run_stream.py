"""Tests for milestone run SSE stream adapter."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from agents_app.agents.core.milestone_run.stream import iter_milestone_run_sse_lines


@pytest.mark.asyncio
async def test_iter_milestone_run_sse_lines_yields_done_payload() -> None:
    async def fake_astream(*_a: object, **_k: object):
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

    with patch(
        "agents_app.agents.core.milestone_run.stream.build_milestone_run_graph",
        return_value=mock_graph,
    ):
        lines: list[str] = []
        async for line in iter_milestone_run_sse_lines(
            client=MagicMock(spec=AsyncMock),
            milestone_id="m1",
            location_id=2,
            user_id="u1",
        ):
            lines.append(line)

    assert len(lines) == 1
    assert "done" in lines[0]
    assert "node-99" in lines[0]
    assert "All good" in lines[0]
    assert "c1" in lines[0] and "pass" in lines[0]
    assert "dataPreview" not in lines[0]


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

    with patch(
        "agents_app.agents.core.milestone_run.stream.build_milestone_run_graph",
        return_value=mock_graph,
    ):
        lines: list[str] = []
        async for line in iter_milestone_run_sse_lines(
            client=MagicMock(spec=AsyncMock),
            milestone_id="m1",
            location_id=2,
            user_id="u1",
        ):
            lines.append(line)

    assert len(lines) == 1
    assert "dataPreview" in lines[0]
    assert "## Updated" in lines[0]
