"""Parse milestone SKILL.md: YAML frontmatter + markdown body (tool-based skills)."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field


class SkillMarkdownConfig(BaseModel):
    """SKILL.md with frontmatter + body only."""

    name: str
    description: str
    body: str
    extra_tools: list[str] = Field(default_factory=list)
    inject_prior_presets: list[str] = Field(default_factory=list)


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


def _normalize_extra_tools_raw(raw: Any) -> list[str]:
    """Parse ``extra_tools`` from YAML: list of non-empty strings, or absent/None → []."""
    if raw is None:
        return []
    if not isinstance(raw, list):
        msg = "SKILL frontmatter extra_tools must be a list of strings or omitted"
        raise ValueError(msg)
    out: list[str] = []
    for i, item in enumerate(raw):
        if not isinstance(item, str):
            msg = f"SKILL frontmatter extra_tools[{i}] must be a string"
            raise ValueError(msg)
        s = item.strip()
        if not s:
            msg = f"SKILL frontmatter extra_tools[{i}] must be non-empty"
            raise ValueError(msg)
        out.append(s)
    return out


def _normalize_inject_prior_presets_raw(raw: Any) -> list[str]:
    """Parse ``inject_prior_presets`` from YAML: list of non-empty strings, or absent/None → []."""
    if raw is None:
        return []
    if not isinstance(raw, list):
        msg = "SKILL frontmatter inject_prior_presets must be a list of strings or omitted"
        raise ValueError(msg)
    out: list[str] = []
    for i, item in enumerate(raw):
        if not isinstance(item, str):
            msg = f"SKILL frontmatter inject_prior_presets[{i}] must be a string"
            raise ValueError(msg)
        s = item.strip()
        if not s:
            msg = f"SKILL frontmatter inject_prior_presets[{i}] must be non-empty"
            raise ValueError(msg)
        out.append(s)
    return out


def load_skill_markdown(path: Path | str) -> SkillMarkdownConfig:
    """Load SKILL.md frontmatter + markdown body."""
    p = Path(path)
    raw = p.read_text(encoding="utf-8")
    fm, body = parse_frontmatter(raw)
    return SkillMarkdownConfig(
        name=str(fm.get("name", "")),
        description=str(fm.get("description", "")),
        body=body,
        extra_tools=_normalize_extra_tools_raw(fm.get("extra_tools")),
        inject_prior_presets=_normalize_inject_prior_presets_raw(fm.get("inject_prior_presets")),
    )
