"""Resolve milestone-run SKILL.md paths."""

from __future__ import annotations

from pathlib import Path

_MILESTONE_RUN_SKILLS_ROOT = Path(__file__).resolve().parent / "skills"


def get_milestone_run_skill_path(skill_id: str) -> Path:
    """Resolve ``milestone_run/skills/<skill_id>/SKILL.md`` only (no package fallback)."""
    normalized = skill_id.strip().lower().replace("-", "_")
    candidate = (_MILESTONE_RUN_SKILLS_ROOT / normalized / "SKILL.md").resolve()
    if not candidate.is_file():
        msg = f"No SKILL.md under milestone_run/skills for skill_id={skill_id!r} (expected {candidate})"
        raise FileNotFoundError(msg)
    return candidate
