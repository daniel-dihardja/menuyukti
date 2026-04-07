"""State schema for location profile LangGraph."""

from __future__ import annotations

from typing import Any, TypedDict


class LocationProfileState(TypedDict):
    milestone_id: str
    location_id: int
    user_id: str
    profile_data: dict[str, Any]
    location_data: dict[str, Any] | None
    generated_text: str
    milestonedata_id: str | None
