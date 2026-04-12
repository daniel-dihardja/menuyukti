"""Parse milestone SKILL.md: YAML frontmatter + markdown body (tool-based skills)."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel


class SkillMarkdownConfig(BaseModel):
    """SKILL.md with frontmatter + body only."""

    name: str
    description: str
    body: str


_FRONTMATTER_SPLIT = re.compile(r"^---\s*$", re.MULTILINE)


def parse_frontmatter(markdown: str) -> tuple[dict[str, Any], str]:
    """Split first YAML frontmatter block from markdown body."""
    text = markdown.strip()
    if not text.startswith("---"):
        msg = "SKILL.md must start with --- frontmatter"
        raise ValueError(msg)
    parts = _FRONTMATTER_SPLIT.split(text, maxsplit=2)
    if len(parts) < 3:
        msg = "Invalid SKILL.md: expected closing --- before body"
        raise ValueError(msg)
    _, fm_raw, body = parts
    data = yaml.safe_load(fm_raw.strip())
    if not isinstance(data, dict):
        msg = "SKILL frontmatter must be a YAML mapping"
        raise ValueError(msg)
    return data, body.strip()


def load_skill_markdown(path: Path | str) -> SkillMarkdownConfig:
    """Load SKILL.md frontmatter + markdown body."""
    p = Path(path)
    raw = p.read_text(encoding="utf-8")
    fm, body = parse_frontmatter(raw)
    return SkillMarkdownConfig(
        name=str(fm.get("name", "")),
        description=str(fm.get("description", "")),
        body=body,
    )
