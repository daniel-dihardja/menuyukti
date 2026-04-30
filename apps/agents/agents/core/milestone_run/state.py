"""Shared state shape for the milestone run (tool-using agent) graph."""

from __future__ import annotations

from typing import Any, NotRequired, TypedDict


class MilestoneRunState(TypedDict):
    """State carried through the milestone run graph; tools read/write overlapping fields."""

    milestone_id: str
    location_id: int
    user_id: str
    # Parent workflow node id — when set, prior milestones' data is prefetched for tools.
    workflow_id: str | None
    # Filled before the agent step (e.g. fetch_context node)
    goal: str
    raw_data: str
    # Structured milestone payload from request (Dates uses object state).
    milestone_data: NotRequired[dict[str, Any] | list[Any] | None]
    # Typed input payload from request.
    milestone_input: NotRequired[dict[str, Any] | None]
    # Goal override from request, if provided.
    request_goal: NotRequired[str | None]
    criteria: list[dict[str, str]]
    # JSON text: prior milestones' milestonedata rows (empty if no workflow_id or no earlier milestones).
    prior_milestones_data: str
    # Workspace API adapter tools (tool_key, url, description); filled in fetch_children.
    api_adapter_tools: list[dict[str, Any]]
    # Set in fetch_children: False when milestone JSON uses fixed skills (skip LLM selector).
    use_llm_skill_selector: NotRequired[bool]
    # Set by select_skills or fetch_children (fixed path); ordered execution
    selected_skill_ids: list[str]
    current_skill_index: int
    # Convenience: first selected id (same as selected_skill_ids[0] when non-empty)
    selected_skill_id: str | None
    # Written by agent tools / graph merge
    result_data: str
    # Set True when write_result_data tool persists milestonedata (for SSE dataPreview).
    milestonedata_written: bool
    result_summary: str
    result_node_id: str | None
    # Set by finalize_eval (criterion graph) for SSE ``done.criteria`` (id + status per criterion)
    last_criteria_verdicts: list[dict[str, Any]]
    # Correlates one user-triggered run across SSE, LangSmith, and DB (set by stream adapter).
    run_id: NotRequired[str]
    # W3C trace context from BFF (optional distributed tracing).
    traceparent: NotRequired[str | None]
