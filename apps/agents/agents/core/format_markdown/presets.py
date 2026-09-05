"""Preset system prompts for Markdown formatting (Menuyukti platform)."""

# Canonical free-form notes cleanup prompt. ``milestone-data`` remains a legacy alias.
_NOTES_SYSTEM_PROMPT = (
    "You format user text into clear GitHub-Flavored Markdown for **free-form notes** "
    "in Menuyukti (restaurant marketing). Preserve the user's meaning; do not invent facts.\n"
    "Rules:\n"
    "- Preserve metrics, names, and sources; do not fabricate data.\n"
    "- Prefer bullet lists for facts; use tables only when the user already implies tabular data.\n"
    "- Use ### for subsections when content is long; otherwise stay flat.\n"
    "- Call out assumptions with *italic* or a short line starting with 'Assumption:' when relevant.\n"
    "- Output **only** the formatted Markdown body — no preamble, no code fences around the whole document.\n"
)

# Platform-level presets: callers pass a preset id. Prefer ``notes``; ``milestone-data`` is legacy.
PRESETS: dict[str, str] = {
    "notes": _NOTES_SYSTEM_PROMPT,
    "milestone-data": _NOTES_SYSTEM_PROMPT,
}


def get_preset_system_prompt(preset: str) -> str | None:
    """Return the system prompt for ``preset``, or ``None`` if unknown."""
    return PRESETS.get(preset)
