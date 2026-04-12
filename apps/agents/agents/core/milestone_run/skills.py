"""Registry of milestone run skills (id → system prompt for the execute agent)."""

from __future__ import annotations

from dataclasses import dataclass

from agents_app.agents.core.milestone_run.prompts import (
    GENERIC_SKILL_PROMPT,
    PUBLIC_HOLIDAYS_SKILL_PROMPT,
    RESTAURANT_BRAND_BRIEF_SKILL_PROMPT,
)


@dataclass(frozen=True)
class SkillDef:
    """One selectable skill: metadata for routing + prompt body for the ReAct execute step."""

    id: str
    name: str
    description: str
    prompt: str


def _build_registry() -> dict[str, SkillDef]:
    return {
        "public_holidays": SkillDef(
            id="public_holidays",
            name="Public holidays",
            description=(
                "Use when the milestone goal or pass criteria require listing, confirming, or "
                "filling in public holidays for a date range for this location's country."
            ),
            prompt=PUBLIC_HOLIDAYS_SKILL_PROMPT,
        ),
        "generic": SkillDef(
            id="generic",
            name="Generic milestone data prep",
            description=(
                "Use for standard milestone runs: read goal, criteria, and Data tab; improve or "
                "complete the Data tab (Markdown). Evaluation and summary run automatically after skills."
            ),
            prompt=GENERIC_SKILL_PROMPT,
        ),
        "restaurant_brand_brief": SkillDef(
            id="restaurant_brand_brief",
            name="Brand brief",
            description=(
                "Produces or refines a Markdown brand brief from the Data tab (often pre-filled from "
                "POS operating profile, category mix, and menu catalog via Prepare)—foundation for multi-week "
                "social campaigns."
            ),
            prompt=RESTAURANT_BRAND_BRIEF_SKILL_PROMPT,
        ),
    }


SKILL_REGISTRY: dict[str, SkillDef] = _build_registry()

DEFAULT_SKILL_ID = "generic"


def format_skills_for_selector(registry: dict[str, SkillDef]) -> str:
    """Human-readable bullet list of skill ids and descriptions for the selector LLM."""
    lines: list[str] = []
    for sid, sdef in registry.items():
        lines.append(f"- **`{sid}`** — {sdef.name}: {sdef.description}")
    return "\n".join(lines)
