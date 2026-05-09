"""State schema for dedicated format-mix milestone execution."""

from __future__ import annotations

from typing import Any, NotRequired, TypedDict


class FormatMixState(TypedDict):
    """State carried through format-mix fetch (campaign brief) and persistence."""

    milestone_id: str
    location_id: int
    user_id: str
    goal: str
    criteria: list[dict[str, str]]
    milestone_input: NotRequired[dict[str, Any] | None]
    run_id: NotRequired[str]
    traceparent: NotRequired[str | None]
    prior_milestones_data: NotRequired[str]
    injected_prior_context_markdown: NotRequired[str]
    campaign_brief_data: NotRequired[dict[str, Any] | None]
    result_data: str
    milestone_data: NotRequired[dict[str, Any] | list[Any] | None]
    milestonedata_written: bool
