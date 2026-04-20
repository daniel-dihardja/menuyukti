"""Milestone-run output schemas for runtime validation at write boundary."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ValidationError


class SchedulerScheduleRow(BaseModel):
    dateTime: str
    type: Literal["single", "carousel"]
    promotedMenuItems: list[str]
    visualIdea: str
    captionIdea: str


class SchedulerMilestoneOutput(BaseModel):
    schedules: list[SchedulerScheduleRow]


def validate_scheduler_output(payload: Any) -> tuple[dict[str, Any] | None, str | None]:
    """Return normalized scheduler payload or a human-readable validation error."""
    try:
        validated = SchedulerMilestoneOutput.model_validate(payload)
    except ValidationError as exc:
        return None, exc.errors(include_url=False)[0]["msg"]
    return validated.model_dump(), None
