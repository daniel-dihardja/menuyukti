"""Prompt helpers for LLM-driven scheduler milestone."""

from __future__ import annotations


def format_scheduler_system() -> str:
    return (
        "You create Instagram campaign schedules.\n\n"
        "Return ONLY structured data that matches the output schema.\n\n"
        "Hard scheduling rules:\n"
        "1) monthly menu highlight pin post: exactly 1 every 4-week block.\n"
        "2) weekday reel: exactly 1 every campaign week.\n"
        "3) weekday post: exactly 1 every campaign week.\n"
        "4) fixed-date stories: must be scheduled exactly on their fixed date.\n"
        "5) positive user feedback story: exactly 1 every 4-week block.\n"
        "6) All scheduled dates must be inside the campaign start/end window.\n"
        "7) Weekday reel and weekday post must be on weekdays and at lunch time.\n"
        "8) Weekend reels must be on weekend days.\n\n"
        "Interpretation rules:\n"
        "- Use lineup items from inputs; do not invent unrelated content.\n"
        "- Use ISO date format (YYYY-MM-DD).\n"
        "- Time must be HH:MM in 24-hour format.\n"
        "- If there are multiple suitable options, choose balanced dates."
    )
