"""Prompt helpers for LLM-driven scheduler milestone."""

from __future__ import annotations

# Hard cap: 50% of a typical verbose scheduleExplanation (~1708 chars).
SCHEDULE_EXPLANATION_MAX_CHARS = 854
SCHEDULE_EXPLANATION_MAX_WORDS = 75
# Prompt target so the model stays well under the hard cap.
SCHEDULE_EXPLANATION_TARGET_CHARS = 380


def format_scheduler_system() -> str:
    return (
        "You create Instagram campaign schedules.\n\n"
        "Return ONLY structured data that matches the output schema.\n\n"
        "Hard scheduling rules:\n"
        "1) top five category post: exactly 1 of each top_five_category post id every 4-week block.\n"
        "2) weekday reel: exactly 1 every campaign week.\n"
        "3) fixed-date stories: must be scheduled exactly on their fixed date.\n"
        "4) positive user feedback story: exactly 1 every 4-week block.\n"
        "5) All scheduled dates must be inside the campaign start/end window.\n"
        "6) Weekday reels must be on weekdays and at lunch time.\n"
        "7) Weekend reels must be on weekend days.\n\n"
        "Interpretation rules:\n"
        "- Use lineup items from inputs; do not invent unrelated content.\n"
        "- Use ISO date format (YYYY-MM-DD).\n"
        "- Time must be HH:MM in 24-hour format.\n"
        "- If there are multiple suitable options, choose balanced dates.\n\n"
        "scheduleExplanation (required; HARD LIMIT—outputs over the limit are rejected):\n"
        f"- Maximum {SCHEDULE_EXPLANATION_MAX_WORDS} words and {SCHEDULE_EXPLANATION_MAX_CHARS} "
        f"characters. Aim for about {SCHEDULE_EXPLANATION_TARGET_CHARS} characters.\n"
        "- Exactly 2 short sentences—one per topic below. No third sentence. No bullet lists.\n"
        "- Sentence 1: weekday reel schedule—why you chose that weekday date and time "
        "(use the times from your slots; summarize the pattern if weeks differ).\n"
        "- Sentence 2: weekend reel schedule—why you chose that weekend date and time.\n"
        "- Do NOT explain monthly pins, stories, or overall campaign strategy.\n"
        "- FORBIDDEN: multi-paragraph text; listing every campaign week; quoting long "
        "brief copy; filler like 'strategically', 'foundational piece', 'maximum visibility'.\n"
        "- GOOD (~200 chars): \"Weekday reels at 12:15 on Tue target lunch breaks before "
        "the weekend push. Saturday 12:15 weekend reel catches leisure diners.\"\n"
        "- BAD: monthly pin rationale, story timing, or text longer than the GOOD example."
    )
