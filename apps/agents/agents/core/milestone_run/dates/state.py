"""State schema for dedicated dates milestone execution."""

from __future__ import annotations

from typing import Any, NotRequired, TypedDict


class DatesState(TypedDict):
    """State carried through dedicated dates fetch and persistence."""

    milestone_id: str
    location_id: int
    user_id: str
    goal: str
    criteria: list[dict[str, str]]
    milestone_input: NotRequired[dict[str, Any] | None]
    run_id: NotRequired[str]
    traceparent: NotRequired[str | None]
    start_date: str
    end_date: str
    public_holidays: list[dict[str, Any]]
    result_data: str
    milestone_data: NotRequired[dict[str, Any] | list[Any] | None]
    milestonedata_written: bool
