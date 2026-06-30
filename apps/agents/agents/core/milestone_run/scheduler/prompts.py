"""Prompt helpers for LLM-driven scheduler milestone."""

from __future__ import annotations

from agents_app.agents.core.milestone_run.dates_window import TOP_FIVE_CATEGORY_INTERVAL_WEEKS

# Hard cap: 50% of a typical verbose scheduleExplanation (~1708 chars).
SCHEDULE_EXPLANATION_MAX_CHARS = 854
SCHEDULE_EXPLANATION_MAX_WORDS = 75
# Prompt target so the model stays well under the hard cap.
SCHEDULE_EXPLANATION_TARGET_CHARS = 380


def format_scheduler_system(
    *,
    has_post_lineup: bool,
    has_reel_lineup: bool,
    has_story_lineup: bool,
) -> str:
    rules: list[str] = [
        "All scheduled dates must be inside the campaign start/end window.",
    ]
    if has_post_lineup:
        rules.append(
            "top five category post: schedule exactly ONE top_five_category post every "
            f"{TOP_FIVE_CATEGORY_INTERVAL_WEEKS}-week block (not one of each post per block). "
            "Rotate through topFiveCadence.rotationOrder in the input: first post near the "
            "campaign start, next lineup post two weeks later, then continue round-robin every "
            f"{TOP_FIVE_CATEGORY_INTERVAL_WEEKS} weeks. "
            "Example with posts A and B: block 1 → A, block 2 → B, block 3 → A — never A and B "
            "in the same block or in consecutive weeks."
        )
    if has_reel_lineup:
        rules.extend(
            [
                "weekday reel: exactly 1 every campaign week that has a weekday in the window.",
                "Weekday reels must be on weekdays and at lunch time.",
                "Weekend reels must be on weekend days.",
            ]
        )
    if has_story_lineup:
        rules.extend(
            [
                "fixed-date stories: must be scheduled exactly on their fixed date.",
                "positive user feedback story: exactly 1 every 4-week block.",
            ]
        )

    numbered_rules = "\n".join(f"{idx}) {rule}" for idx, rule in enumerate(rules, start=1))

    if has_reel_lineup:
        explanation_guidance = (
            "- Exactly 2 short sentences—one per topic below. No third sentence. No bullet lists.\n"
            "- Sentence 1: weekday reel schedule—why you chose that weekday date and time "
            "(use the times from your slots; summarize the pattern if weeks differ).\n"
            "- Sentence 2: weekend reel schedule—why you chose that weekend date and time.\n"
            "- GOOD (~200 chars): \"Weekday reels at 12:15 on Tue target lunch breaks before "
            "the weekend push. Saturday 12:15 weekend reel catches leisure diners.\""
        )
    else:
        explanation_guidance = (
            "- Exactly 2 short sentences summarizing the main scheduling choices for the "
            "content types you scheduled. No third sentence. No bullet lists.\n"
            "- Focus on timing rationale for posts and/or stories when present."
        )

    return (
        "You create Instagram campaign schedules.\n\n"
        "Return ONLY structured data that matches the output schema.\n\n"
        "Hard scheduling rules:\n"
        f"{numbered_rules}\n\n"
        "Interpretation rules:\n"
        "- Schedule ONLY content kinds that have candidates in the input; skip missing lineups.\n"
        "- Use lineup items from inputs; do not invent unrelated content.\n"
        "- Use ISO date format (YYYY-MM-DD).\n"
        "- Time must be HH:MM in 24-hour format.\n"
        "- If there are multiple suitable options, choose balanced dates.\n\n"
        "scheduleExplanation (required; HARD LIMIT—outputs over the limit are rejected):\n"
        f"- Maximum {SCHEDULE_EXPLANATION_MAX_WORDS} words and {SCHEDULE_EXPLANATION_MAX_CHARS} "
        f"characters. Aim for about {SCHEDULE_EXPLANATION_TARGET_CHARS} characters.\n"
        f"{explanation_guidance}\n"
        "- Do NOT explain overall campaign strategy beyond the slots you placed.\n"
        "- FORBIDDEN: multi-paragraph text; listing every campaign week; quoting long "
        "brief copy; filler like 'strategically', 'foundational piece', 'maximum visibility'.\n"
        "- BAD: text longer than the GOOD example when reels are present."
    )
