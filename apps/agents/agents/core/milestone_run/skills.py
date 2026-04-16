"""Registry of milestone run skills (id → system prompt for the execute agent)."""

from __future__ import annotations

from dataclasses import dataclass

from agents_app.agents.core.milestone_run.skill_markdown import load_skill_markdown
from agents_app.agents.core.milestone_run.skill_paths import get_milestone_run_skill_path
from agents_app.agents.core.milestone_run.tools.registry import validate_extra_tool_ids


@dataclass(frozen=True)
class SkillDef:
    """One selectable skill: metadata for routing + prompt body for the ReAct execute step."""

    id: str
    name: str
    description: str
    prompt: str
    extra_tool_ids: tuple[str, ...]


def _load_disk_skill(skill_id: str) -> SkillDef:
    path = get_milestone_run_skill_path(skill_id)
    md = load_skill_markdown(path)
    validate_extra_tool_ids(md.extra_tools)
    desc = md.description.strip() if md.description else ""
    name = (md.name or skill_id).strip() or skill_id
    return SkillDef(
        id=skill_id,
        name=name,
        description=desc,
        prompt=md.body,
        extra_tool_ids=tuple(md.extra_tools),
    )


def _build_registry() -> dict[str, SkillDef]:
    return {
        "public_holidays": _load_disk_skill("public_holidays"),
        "brand_brief": _load_disk_skill("brand_brief"),
        "promotion_candidates": _load_disk_skill("promotion_candidates"),
        "generic": _load_disk_skill("generic"),
    }


SKILL_REGISTRY: dict[str, SkillDef] = _build_registry()

DEFAULT_SKILL_ID = "generic"


def format_skills_for_selector(registry: dict[str, SkillDef]) -> str:
    """Human-readable bullet list of skill ids and descriptions for the selector LLM."""
    lines: list[str] = []
    for sid, sdef in registry.items():
        lines.append(f"- **`{sid}`** — {sdef.name}: {sdef.description}")
    return "\n".join(lines)
