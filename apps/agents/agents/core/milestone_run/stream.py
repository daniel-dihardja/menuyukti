"""SSE streaming adapter for milestone run (isolates LangGraph from HTTP routers)."""

from __future__ import annotations

import json
import logging
import uuid
from collections.abc import AsyncIterator
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.graph import build_milestone_run_graph
from agents_app.agents.core.milestone_run.run_persistence import (
    complete_milestone_agent_run_record,
    start_milestone_agent_run_record,
)

_logger = logging.getLogger(__name__)

_TIMELINE_MAX = 200


def format_sse_line(payload: object) -> str:
    """Serialize one Server-Sent Event data line."""
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _compact_trace_entry(chunk: dict[str, Any]) -> dict[str, Any]:
    """Store a small timeline row (no prompts or tool payloads)."""
    out: dict[str, Any] = {}
    if "step" in chunk:
        out["step"] = chunk["step"]
    if "agent_event" in chunk:
        out["agent_event"] = chunk["agent_event"]
    for key in ("skill_id", "skill_index", "skill_count"):
        if key in chunk:
            out[key] = chunk[key]
    return out


def _summary_from_final_state(fs: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(fs, dict):
        return {}
    rs = fs.get("result_summary")
    summary_text = rs if isinstance(rs, str) else str(rs or "")
    return {
        "result_node_id": fs.get("result_node_id"),
        "result_summary_preview": summary_text[:500],
        "selected_skill_ids": fs.get("selected_skill_ids"),
        "milestonedata_written": fs.get("milestonedata_written"),
    }


async def iter_milestone_run_sse_lines(
    *,
    client: httpx.AsyncClient,
    milestone_id: str,
    location_id: int,
    user_id: str,
    workflow_id: str | None = None,
    traceparent: str | None = None,
) -> AsyncIterator[str]:
    """Stream Server-Sent Event lines: run_id, custom step payloads, then a final ``done`` object."""
    run_id = str(uuid.uuid4())
    yield format_sse_line({"run_id": run_id})

    started = await start_milestone_agent_run_record(
        client,
        run_id=run_id,
        milestone_id=milestone_id,
        user_id=user_id,
        workflow_id=workflow_id,
        traceparent=traceparent,
    )

    initial: dict[str, Any] = {
        "milestone_id": milestone_id,
        "location_id": location_id,
        "user_id": user_id,
        "workflow_id": workflow_id,
        "run_id": run_id,
        "goal": "",
        "raw_data": "",
        "criteria": [],
        "prior_milestones_data": "",
        "api_adapter_tools": [],
        "result_data": "",
        "milestonedata_written": False,
        "result_summary": "",
        "result_node_id": None,
        "last_criteria_verdicts": [],
        "selected_skill_ids": [],
        "current_skill_index": 0,
        "selected_skill_id": None,
    }
    if traceparent:
        initial["traceparent"] = traceparent

    final_state: dict[str, Any] | None = None
    timeline: list[dict[str, Any]] = []
    run_ok = False
    stream_error: str | None = None

    _logger.info(
        "milestone_run.sse: starting graph astream run_id=%s milestone_id=%s location_id=%s",
        run_id,
        milestone_id,
        initial["location_id"],
    )
    graph = build_milestone_run_graph(client)
    run_config: dict[str, Any] = {
        "metadata": {
            "run_id": run_id,
            "milestone_id": milestone_id,
            "workflow_id": workflow_id,
        },
    }
    if traceparent:
        run_config["metadata"]["traceparent"] = traceparent

    try:
        async for mode, chunk in graph.astream(
            initial,
            stream_mode=["custom", "values"],
            config=run_config,
        ):
            if mode == "custom":
                _logger.debug("milestone_run.sse: custom chunk=%s", chunk)
                if isinstance(chunk, dict) and len(timeline) < _TIMELINE_MAX:
                    timeline.append(_compact_trace_entry(chunk))
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
                "run_id": str(final_state.get("run_id") or run_id),
                "resultId": str(final_state.get("result_node_id") or ""),
                "summary": str(final_state.get("result_summary") or ""),
                "criteria": criteria_payload,
            }
            if final_state.get("milestonedata_written"):
                done_payload["dataPreview"] = str(final_state.get("result_data") or "")
            yield format_sse_line(done_payload)
            run_ok = True
        else:
            stream_error = "missing_final_state"
            _logger.error(
                "milestone_run.sse: no final state run_id=%s milestone_id=%s",
                run_id,
                milestone_id,
            )
    except Exception as e:
        stream_error = str(e)
        raise
    finally:
        if started:
            await complete_milestone_agent_run_record(
                client,
                run_id=run_id,
                user_id=user_id,
                status="success" if run_ok else "error",
                summary=_summary_from_final_state(final_state),
                timeline=timeline or None,
                error_message=None if run_ok else stream_error,
            )
