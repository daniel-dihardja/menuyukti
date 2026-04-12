"""Resolve Prepare (Data tab Generate) and milestone-run SKILL.md paths."""

from __future__ import annotations

import logging
from pathlib import Path

from agent_skills import get_skill_path

_logger = logging.getLogger(__name__)

_MILESTONE_RUN_SKILLS_ROOT = Path(__file__).resolve().parent / "skills"


def get_milestone_run_skill_path(skill_id: str) -> Path:
    """Resolve ``milestone_run/skills/<skill_id>/SKILL.md`` only (no package fallback)."""
    normalized = skill_id.strip().lower().replace("-", "_")
    candidate = (_MILESTONE_RUN_SKILLS_ROOT / normalized / "SKILL.md").resolve()
    if not candidate.is_file():
        msg = f"No SKILL.md under milestone_run/skills for skill_id={skill_id!r} (expected {candidate})"
        raise FileNotFoundError(msg)
    return candidate


def get_prepare_skill_path(skill_id: str) -> Path:
    """Prefer ``milestone_run/skills/<skill_id>/SKILL.md``; fall back to legacy ``agent_skills`` package."""
    normalized = skill_id.strip().lower().replace("-", "_")
    candidate = (_MILESTONE_RUN_SKILLS_ROOT / normalized / "SKILL.md").resolve()
    if candidate.is_file():
        return candidate
    legacy = get_skill_path(skill_id)
    _logger.warning(
        "Prepare skill %r resolved via legacy packages/agent-skills; migrate to milestone_run/skills (path=%s)",
        skill_id,
        legacy,
    )
    return legacy
