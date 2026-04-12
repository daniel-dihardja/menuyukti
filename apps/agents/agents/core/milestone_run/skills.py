"""Registry of milestone run skills (id → system prompt for the execute agent)."""

from __future__ import annotations

from dataclasses import dataclass

from agents_app.agents.core.milestone_run.skill_paths import get_milestone_run_skill_path
from agents_app.agents.domain.skill_runner.loader import load_skill_markdown


@dataclass(frozen=True)
class SkillDef:
    """One selectable skill: metadata for routing + prompt body for the ReAct execute step."""

    id: str
    name: str
    description: str
    prompt: str


def _load_disk_skill(skill_id: str) -> SkillDef:
    path = get_milestone_run_skill_path(skill_id)
    md = load_skill_markdown(path)
    desc = md.description.strip() if md.description else ""
    name = (md.name or skill_id).strip() or skill_id
    return SkillDef(id=skill_id, name=name, description=desc, prompt=md.body)


def _build_registry() -> dict[str, SkillDef]:
    return {
        "public_holidays": _load_disk_skill("public_holidays"),
        "generic": _load_disk_skill("generic"),
        "promotion_candidates": _load_disk_skill("promotion_candidates"),
        "restaurant_brand_brief": _load_disk_skill("restaurant_brand_brief"),
    }


SKILL_REGISTRY: dict[str, SkillDef] = _build_registry()

DEFAULT_SKILL_ID = "generic"


def format_skills_for_selector(registry: dict[str, SkillDef]) -> str:
    """Human-readable bullet list of skill ids and descriptions for the selector LLM."""
    lines: list[str] = []
    for sid, sdef in registry.items():
        lines.append(f"- **`{sid}`** — {sdef.name}: {sdef.description}")
    return "\n".join(lines)
