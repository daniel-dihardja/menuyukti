"""Prompt helpers for LLM-driven scheduler milestone."""

from __future__ import annotations

# Hard cap: 50% of a typical verbose scheduleExplanation (~1708 chars).
SCHEDULE_EXPLANATION_MAX_CHARS = 854
SCHEDULE_EXPLANATION_MAX_WORDS = 75
# Prompt target so the model stays well under the hard cap.
SCHEDULE_EXPLANATION_TARGET_CHARS = 380


def format_scheduler_system() -> str:
    rules = [
        "All scheduled dates must be inside the campaign start/end window.",
        "Use ISO date format (YYYY-MM-DD) and HH:MM 24-hour times.",
        "Derive slot kinds (post, story, reel), titles, dates, and times from the campaign "
        "brief strategy, offer window, cadence guidance, and public holidays in the input.",
        "Place at least one slot in the window when the brief supports Instagram activity.",
        "Prefer lunch-time windows from overallStrategy.offerWindow when scheduling weekday posts "
        "or reels.",
        "Schedule public-holiday-aware story or post slots on or near listed public holidays "
        "when the brief calls for seasonal messaging.",
    ]
    numbered_rules = "\n".join(f"{idx}) {rule}" for idx, rule in enumerate(rules, start=1))

    explanation_guidance = (
        "- Exactly 2 short sentences summarizing the main scheduling choices. "
        "No third sentence. No bullet lists.\n"
        "- Focus on timing rationale (why these dates/times) aligned with the brief."
    )

    return (
        "You create Instagram campaign schedules.\n\n"
        "Return ONLY structured data that matches the output schema.\n\n"
        "Hard scheduling rules:\n"
        f"{numbered_rules}\n\n"
        "Interpretation rules:\n"
        "- Each slot has kind (story | post | reel), date, time, and a descriptive title.\n"
        "- Titles should reflect campaign brief messaging; do not copy long brief paragraphs.\n"
        "- If there are multiple suitable options, choose balanced dates across the window.\n\n"
        "scheduleExplanation (required; HARD LIMIT—outputs over the limit are rejected):\n"
        f"- Maximum {SCHEDULE_EXPLANATION_MAX_WORDS} words and {SCHEDULE_EXPLANATION_MAX_CHARS} "
        f"characters. Aim for about {SCHEDULE_EXPLANATION_TARGET_CHARS} characters.\n"
        f"{explanation_guidance}\n"
        "- Do NOT explain overall campaign strategy beyond the slots you placed.\n"
        "- FORBIDDEN: multi-paragraph text; listing every campaign week; quoting long "
        "brief copy; filler like 'strategically', 'foundational piece', 'maximum visibility'."
    )
