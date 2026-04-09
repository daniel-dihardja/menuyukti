"""Bundled runtime milestone SKILL.md files for the agents service."""

from __future__ import annotations

from pathlib import Path

_SKILLS_ROOT = Path(__file__).resolve().parent / "skills"


def list_skill_ids() -> list[str]:
    """Return skill folder names that contain a ``SKILL.md`` file."""
    if not _SKILLS_ROOT.is_dir():
        return []
    out: list[str] = []
    for child in sorted(_SKILLS_ROOT.iterdir()):
        if child.is_dir() and (child / "SKILL.md").is_file():
            out.append(child.name)
    return out


def get_skill_path(skill_id: str) -> Path:
    """Absolute path to ``skills/<skill_id>/SKILL.md``."""
    p = (_SKILLS_ROOT / skill_id / "SKILL.md").resolve()
    if not p.is_file():
        msg = f"Skill not found: {skill_id!r} (expected {p})"
        raise FileNotFoundError(msg)
    return p


__all__ = ["get_skill_path", "list_skill_ids"]
