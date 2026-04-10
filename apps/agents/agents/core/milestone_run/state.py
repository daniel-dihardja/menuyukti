"""Shared state shape for the milestone run (tool-using agent) graph."""

from __future__ import annotations

from typing import Any, TypedDict


class MilestoneRunState(TypedDict):
    """State carried through the milestone run graph; tools read/write overlapping fields."""

    milestone_id: str
    location_id: int
    user_id: str
    # Filled before the agent step (e.g. fetch_context node)
    goal: str
    raw_data: str
    criteria: list[dict[str, str]]
    # Written by agent tools / graph merge
    result_data: str
    # Set True when write_result_data tool persists milestonedata (for SSE dataPreview).
    milestonedata_written: bool
    result_summary: str
    result_node_id: str | None
    # Set by write_result for SSE ``done.criteria`` (id + status per criterion)
    last_criteria_verdicts: list[dict[str, Any]]
