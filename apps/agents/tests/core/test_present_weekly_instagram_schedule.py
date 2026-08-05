"""Tests for present_weekly_instagram_schedule presentation tool."""

from __future__ import annotations

import json


def test_present_weekly_instagram_schedule_returns_ok() -> None:
    from agents_app.agents.core.chat.present_weekly_instagram_schedule import (
        WeeklyInstagramScheduleDay,
        present_weekly_instagram_schedule,
    )

    days = [
        WeeklyInstagramScheduleDay(
            day="monday",
            time="11:30",
            format="story",
            menu_items="Lunch set",
            caption_angle="Speed",
            why="Peak Mon lunch",
        )
    ]
    raw = present_weekly_instagram_schedule.invoke(
        {
            "title": "Weekly plan",
            "summary": "Grounded in demand",
            "days": [d.model_dump() for d in days],
        }
    )
    payload = json.loads(raw)
    assert payload["ok"] is True
    assert payload["action"] == "present_weekly_instagram_schedule"
    assert payload["title"] == "Weekly plan"
    assert payload["summary"] == "Grounded in demand"
    assert payload["days"] == [d.model_dump() for d in days]


def test_present_weekly_instagram_schedule_allows_multiple_slots_same_day() -> None:
    from agents_app.agents.core.chat.present_weekly_instagram_schedule import (
        WeeklyInstagramScheduleDay,
        present_weekly_instagram_schedule,
    )

    days = [
        WeeklyInstagramScheduleDay(
            day="monday",
            time="8:00 AM",
            format="story",
            menu_items="Breakfast set",
            caption_angle="Morning rush",
            why="Strong breakfast demand",
        ),
        WeeklyInstagramScheduleDay(
            day="monday",
            time="1:00 PM",
            format="post",
            menu_items="Lunch special",
            caption_angle="Midday feature",
            why="Peak lunch slot",
        ),
    ]
    raw = present_weekly_instagram_schedule.invoke(
        {
            "title": "Multi-slot Monday",
            "summary": "Two Monday posts",
            "days": [d.model_dump() for d in days],
        }
    )
    payload = json.loads(raw)
    assert len(payload["days"]) == 2
    assert payload["days"][0]["day"] == "monday"
    assert payload["days"][1]["day"] == "monday"
    assert payload["days"][0]["format"] == "story"
    assert payload["days"][1]["format"] == "post"


def test_chat_tools_list_includes_present_weekly_in_general_mode() -> None:
    from agents_app.agents.core.chat.graph import chat_tools_list, chat_tools_list_from_config

    names = [getattr(t, "name", "") for t in chat_tools_list()]
    assert "present_weekly_instagram_schedule" in names

    image_names = [
        getattr(t, "name", "")
        for t in chat_tools_list_from_config(
            {
                "chat_mode": "image_assistant",
                "agent_thread_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            }
        )
    ]
    assert "present_weekly_instagram_schedule" not in image_names


def test_system_prompt_mentions_weekly_schedule_tool() -> None:
    from agents_app.agents.core.chat.prompts import build_system_prompt

    out = build_system_prompt()
    assert "present_weekly_instagram_schedule" in out
    assert "multi-column markdown tables" in out
    assert "Do **not** call the tool for open-ended advice" in out
    assert "normal markdown instead" in out
    assert "Fewer than 7" in out
    assert "entries is fine" in out
    assert "repeat that weekday" in out
    assert "per posting slot" in out
