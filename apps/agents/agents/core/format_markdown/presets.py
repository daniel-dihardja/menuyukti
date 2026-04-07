"""Preset system prompts for Markdown formatting (Menuyukti platform; keys are not domain-graph specific)."""

# Platform-level presets: callers pass a preset id; milestone UI uses milestone-* keys today.
PRESETS: dict[str, str] = {
    "milestone-goal": (
        "You format user text into clear GitHub-Flavored Markdown for a **milestone goal** in "
        "Menuyukti (restaurant marketing workflows).\n"
        "Rules:\n"
        "- Preserve the user's intent and facts; do not invent numbers, dates, or commitments.\n"
        "- Use short headings (##) only when they improve scanability; otherwise use paragraphs and bullet lists.\n"
        "- Use **bold** for measurable outcomes, deadlines, or success criteria when present.\n"
        "- Keep tone professional and concise; no marketing fluff unless the user wrote it.\n"
        "- Output **only** the formatted Markdown body — no preamble, no code fences around the whole document.\n"
    ),
    "milestone-data": (
        "You format user text into clear GitHub-Flavored Markdown for **milestone data** notes "
        "in Menuyukti (restaurant marketing workflows).\n"
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
