"""Registry of milestone-run tool ids: core reads, write, and optional extras from SKILL.md."""

from __future__ import annotations

from collections.abc import Callable, Sequence
from typing import Any

import httpx
from agents_app.agents.core.milestone_run.tools.get_location_profile import (
    make_get_location_profile_tool,
)
from agents_app.agents.core.milestone_run.tools.get_promotion_candidates import (
    make_get_promotion_candidates_tool,
)
from agents_app.agents.core.milestone_run.tools.get_public_holidays import (
    make_get_public_holidays_tool,
)
from agents_app.agents.core.milestone_run.tools.get_scheduler_plan import (
    make_get_scheduler_plan_tool,
)
from langchain_core.tools import BaseTool

CORE_READ_TOOL_IDS: tuple[str, ...] = (
    "read_goal",
    "read_criteria",
    "read_data",
    "read_prior_milestones_data",
)

WRITE_TOOL_ID = "write_result_data"

_RESERVED_TOOL_IDS: frozenset[str] = frozenset((*CORE_READ_TOOL_IDS, WRITE_TOOL_ID))

ExtraToolFactory = Callable[[dict[str, Any], int, str, httpx.AsyncClient], BaseTool]

EXTRA_TOOL_FACTORIES: dict[str, ExtraToolFactory] = {
    "get_public_holidays": lambda context, lid, uid, client: make_get_public_holidays_tool(
        lid, uid, client=client
    ),
    "get_location_profile": lambda context, lid, uid, client: make_get_location_profile_tool(
        context,
        lid,
        uid,
        client=client,
    ),
    "get_promotion_candidates": lambda context, lid, uid, client: (
        make_get_promotion_candidates_tool(context, lid, uid, client=client)
    ),
    "get_scheduler_plan": lambda context, lid, uid, client: make_get_scheduler_plan_tool(
        context,
        lid,
        uid,
        client=client,
    ),
}


def validate_extra_tool_ids(ids: Sequence[str]) -> None:
    """Ensure each id is registered as an extra tool and not a core/write tool name."""
    for tid in ids:
        if tid in _RESERVED_TOOL_IDS:
            msg = (
                f"extra_tools must not list reserved tool {tid!r} "
                f"(core reads and {WRITE_TOOL_ID} are always attached)"
            )
            raise ValueError(msg)
        if tid not in EXTRA_TOOL_FACTORIES:
            known = ", ".join(sorted(EXTRA_TOOL_FACTORIES))
            msg = f"Unknown extra_tools id {tid!r}; known extras: {known}"
            raise ValueError(msg)


def dedupe_extra_tool_ids(ids: Sequence[str]) -> list[str]:
    """First occurrence wins, order preserved."""
    seen: set[str] = set()
    out: list[str] = []
    for tid in ids:
        if tid not in seen:
            seen.add(tid)
            out.append(tid)
    return out


def make_extra_tools(
    context: dict[str, Any],
    extra_tool_ids: Sequence[str],
    location_id: int,
    user_id: str,
    *,
    client: httpx.AsyncClient,
) -> list[BaseTool]:
    """Instantiate extra tools in YAML order (after dedupe)."""
    tools: list[BaseTool] = []
    for tid in dedupe_extra_tool_ids(extra_tool_ids):
        factory = EXTRA_TOOL_FACTORIES[tid]
        tools.append(factory(context, location_id, user_id, client))
    return tools
