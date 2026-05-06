"""State schema for dedicated brand-brief milestone execution."""

from __future__ import annotations

from typing import Any, NotRequired, TypedDict


class BrandBriefState(TypedDict):
    """State carried through dedicated brand-brief generation and persistence."""

    milestone_id: str
    location_id: int
    user_id: str
    goal: str
    criteria: list[dict[str, str]]
    milestone_input: NotRequired[dict[str, Any] | None]
    run_id: NotRequired[str]
    traceparent: NotRequired[str | None]
    location_raw: dict[str, Any]
    signals_raw: dict[str, Any]
    signal_markdown: str
    generated_output: NotRequired[dict[str, Any] | None]
    result_data: str
    milestone_data: NotRequired[dict[str, Any] | list[Any] | None]
    milestonedata_written: bool
