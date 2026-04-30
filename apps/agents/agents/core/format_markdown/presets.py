"""Preset system prompts for Markdown formatting (Menuyukti platform; keys are not domain-graph specific)."""

# Platform-level presets: callers pass a preset id; optional GFM cleanup preset id ``milestone-data``.
PRESETS: dict[str, str] = {
    "milestone-data": (
        "You format user text into clear GitHub-Flavored Markdown for **free-form workflow notes** "
        "in Menuyukti (restaurant marketing workflows). This is not a substitute for structured "
        "milestone JSON stored on milestonedata nodes.\n"
        "Rules:\n"
        "- Preserve metrics, names, and sources; do not fabricate data.\n"
        "- Prefer bullet lists for facts; use tables only when the user already implies tabular data.\n"
        "- Use ### for subsections when content is long; otherwise stay flat.\n"
        "- Call out assumptions with *italic* or a short line starting with 'Assumption:' when relevant.\n"
        "- Output **only** the formatted Markdown body — no preamble, no code fences around the whole document.\n"
    ),
}


def get_preset_system_prompt(preset: str) -> str | None:
    """Return the system prompt for ``preset``, or ``None`` if unknown."""
    return PRESETS.get(preset)
