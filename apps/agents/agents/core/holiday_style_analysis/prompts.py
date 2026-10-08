"""Prompts for analyzing a style reference image for holiday artwork."""

from __future__ import annotations

MAX_OPERATOR_INSTRUCTIONS_LEN = 2000

STYLE_ANALYSIS_SYSTEM = (
    "You analyze a single reference image that will be the visual foundation for "
    "a series of Instagram story artworks for a restaurant. "
    "Extract a reusable style foundation: overall look, palette, lighting, medium, "
    "and what to avoid. Be concrete and actionable for later image prompts. "
    "Do not invent brand logos or text overlays. Return only the structured fields."
)


def normalize_operator_instructions(raw: str | None) -> str | None:
    if raw is None:
        return None
    text = raw.strip()
    if not text:
        return None
    return text[:MAX_OPERATOR_INSTRUCTIONS_LEN]


def style_analysis_user_text(*, operator_instructions: str | None = None) -> str:
    parts = [
        "Analyze the attached style reference image. "
        "Produce a style foundation that can be applied to many holiday Instagram stories "
        "while keeping a consistent look.\n\n",
    ]
    notes = normalize_operator_instructions(operator_instructions)
    if notes:
        parts.append("## Operator art-direction notes\n\n")
        parts.append(
            "Apply these optional notes when they do not conflict with the image:\n\n"
        )
        parts.append(f"{notes}\n\n")
    parts.append(
        "Fill summary, palette, lighting, medium, and avoid with concrete guidance."
    )
    return "".join(parts)
