"""Resolve Prepare (Data tab Generate) SKILL.md paths: milestone_run skills first, then legacy package."""

from __future__ import annotations

from pathlib import Path

from agent_skills import get_skill_path

_MILESTONE_RUN_SKILLS_ROOT = Path(__file__).resolve().parent / "skills"


def get_prepare_skill_path(skill_id: str) -> Path:
    """Prefer ``milestone_run/skills/<skill_id>/SKILL.md``; fall back to ``agent_skills`` package."""
    candidate = (_MILESTONE_RUN_SKILLS_ROOT / skill_id / "SKILL.md").resolve()
    if candidate.is_file():
        return candidate
    return get_skill_path(skill_id)
