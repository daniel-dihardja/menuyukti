"""SSE streaming adapter for milestone evaluation (isolates LangGraph from HTTP routers)."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

import httpx
from agents_app.agents.core.milestone_eval.graph import build_milestone_eval_graph


def format_sse_line(payload: object) -> str:
    """Serialize one Server-Sent Event data line."""
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


async def iter_milestone_eval_sse_lines(
    *,
    client: httpx.AsyncClient,
    milestone_id: str,
    location_id: int,
    user_id: str,
) -> AsyncIterator[str]:
    """Stream Server-Sent Event lines: custom step payloads, then a final ``done`` object."""
    initial: dict[str, Any] = {
        "milestone_id": milestone_id,
        "location_id": location_id,
        "user_id": user_id,
        "goal": "",
        "raw_data": "",
        "criteria": [],
        "evaluated": [],
        "result_summary": "",
        "result_node_id": None,
    }
    final_state: dict[str, Any] | None = None
    graph = build_milestone_eval_graph(client)
    async for mode, chunk in graph.astream(
        initial,
        stream_mode=["custom", "values"],
    ):
        if mode == "custom":
            yield format_sse_line(chunk)
        elif mode == "values" and isinstance(chunk, dict):
            final_state = chunk

    if isinstance(final_state, dict):
        crit = final_state.get("evaluated", [])
        criteria_payload: list[dict[str, str | None]] = []
        if isinstance(crit, list):
            for e in crit:
                if isinstance(e, dict):
                    criteria_payload.append(
                        {
                            "id": str(e.get("id", "")),
                            "status": str(e.get("status", "")),
                        }
                    )
        yield format_sse_line(
            {
                "done": True,
                "resultId": str(final_state.get("result_node_id") or ""),
                "summary": str(final_state.get("result_summary") or ""),
                "criteria": criteria_payload,
            }
        )
