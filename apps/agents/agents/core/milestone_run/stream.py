"""SSE streaming adapter for milestone run (isolates LangGraph from HTTP routers)."""

from __future__ import annotations

import json
import logging
from collections.abc import AsyncIterator
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.graph import build_milestone_run_graph

_logger = logging.getLogger(__name__)


def format_sse_line(payload: object) -> str:
    """Serialize one Server-Sent Event data line."""
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def iter_milestone_run_sse_lines(
    *,
    client: httpx.AsyncClient,
    milestone_id: str,
    location_id: int,
    user_id: str,
    workflow_id: str | None = None,
) -> AsyncIterator[str]:
    """Stream Server-Sent Event lines: custom step payloads, then a final ``done`` object."""
    initial: dict[str, Any] = {
        "milestone_id": milestone_id,
        "location_id": location_id,
        "user_id": user_id,
        "workflow_id": workflow_id,
        "goal": "",
        "raw_data": "",
        "criteria": [],
        "prior_milestones_data": "",
        "result_data": "",
        "milestonedata_written": False,
        "result_summary": "",
        "result_node_id": None,
        "last_criteria_verdicts": [],
        "selected_skill_ids": [],
        "current_skill_index": 0,
        "selected_skill_id": None,
    }
    final_state: dict[str, Any] | None = None
    _logger.info(
        "milestone_run.sse: starting graph astream milestone_id=%s location_id=%s",
        milestone_id,
        location_id,
    )
    graph = build_milestone_run_graph(client)
    async for mode, chunk in graph.astream(
        initial,
        stream_mode=["custom", "values"],
    ):
        if mode == "custom":
            _logger.debug("milestone_run.sse: custom chunk=%s", chunk)
            yield format_sse_line(chunk)
        elif mode == "values" and isinstance(chunk, dict):
            _logger.debug(
                "milestone_run.sse: values update keys=%s",
                list(chunk.keys()) if isinstance(chunk, dict) else None,
            )
            final_state = chunk

    _logger.info(
        "milestone_run.sse: astream finished milestone_id=%s has_final_state=%s",
        milestone_id,
        final_state is not None,
    )
    if isinstance(final_state, dict):
        last = final_state.get("last_criteria_verdicts", [])
        criteria_payload: list[dict[str, str | None]] = []
        if isinstance(last, list):
            for row in last:
                if isinstance(row, dict):
                    criteria_payload.append(
                        {
                            "id": str(row.get("id", "")),
                            "status": str(row.get("status", "")),
                        }
                    )
        _logger.info(
            "milestone_run.sse: emitting done milestone_id=%s result_id=%s criteria_count=%s",
            milestone_id,
            final_state.get("result_node_id"),
            len(criteria_payload),
        )
        done_payload: dict[str, Any] = {
            "done": True,
            "resultId": str(final_state.get("result_node_id") or ""),
            "summary": str(final_state.get("result_summary") or ""),
            "criteria": criteria_payload,
        }
        if final_state.get("milestonedata_written"):
            done_payload["dataPreview"] = str(final_state.get("result_data") or "")
        yield format_sse_line(done_payload)
