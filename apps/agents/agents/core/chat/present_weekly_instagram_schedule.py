"""Present a weekly Instagram schedule in the chat UI (structured tool args)."""

from __future__ import annotations

import json
from typing import Any

from langchain.tools import tool
from pydantic import BaseModel, Field


class WeeklyInstagramScheduleDay(BaseModel):
    """One posting slot in a weekly Instagram content schedule.

    Multiple entries may share the same weekday when that day has more than one post or
    story (e.g. Monday 8:00 AM story and Monday 1:00 PM feed post). Fields are plain
    strings so the model rarely fails tool-arg validation; the web UI normalizes
    weekdays/formats for display.
    """

    day: str = Field(
        description="Weekday name (e.g. monday, Monday, Mon). Repeat for multiple slots.",
    )
    time: str = Field(
        description=(
            "Suggested local posting clock time ONLY (e.g. '8:00 AM', '11:30', '12:00 PM'). "
            "Do not put the caption or any other text in this field."
        ),
    )
    format: str = Field(
        description="Instagram format: story, post, carousel, or reel.",
    )
    menu_items: str = Field(description="Menu items or dishes to feature in this slot.")
    caption_angle: str = Field(
        description=(
            "Short caption or creative angle ONLY — no posting time, no clock times, "
            "no '8:00 AM —' prefixes."
        ),
    )
    why: str = Field(description="One-line rationale grounded in sales, demand, or venue rhythm.")


def _day_to_dict(day: WeeklyInstagramScheduleDay | dict[str, Any] | Any) -> dict[str, Any]:
    if isinstance(day, WeeklyInstagramScheduleDay):
        return day.model_dump()
    if isinstance(day, BaseModel):
        return day.model_dump()
    if isinstance(day, dict):
        return {
            "day": str(day.get("day") or ""),
            "time": str(
                day.get("time")
                or day.get("posting_time")
                or day.get("postingTime")
                or day.get("slot_time")
                or ""
            ),
            "format": str(day.get("format") or ""),
            "menu_items": str(day.get("menu_items") or day.get("menuItems") or ""),
            "caption_angle": str(
                day.get("caption_angle") or day.get("captionAngle") or day.get("caption") or ""
            ),
            "why": str(day.get("why") or day.get("rationale") or day.get("reason") or ""),
        }
    return {}


@tool
def present_weekly_instagram_schedule(
    title: str,
    summary: str,
    days: list[WeeklyInstagramScheduleDay],
) -> str:
    """Present a weekly Instagram content schedule in the chat UI.

    Call this whenever you propose a weekly Instagram plan (posting slots with time,
    format, menus, caption angle, and why). Use one list entry per slot. When the same
    weekday needs multiple posts or stories, add multiple entries with that same ``day``
    (do not collapse them). The UI renders the schedule from these arguments — do **not**
    also write a multi-column markdown table for the same plan. Keep any surrounding
    assistant text short (brief intro only).
    """
    # Echo schedule in output so the web UI can render even if tool-call args are not
    # forwarded on the live SSE path (history always has args; live stream also sends them).
    return json.dumps(
        {
            "ok": True,
            "action": "present_weekly_instagram_schedule",
            "title": title,
            "summary": summary,
            "days": [_day_to_dict(d) for d in days],
        },
        ensure_ascii=False,
    )
