"""Parse SKILL.md: YAML frontmatter + markdown body."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field


class DataRequirement(BaseModel):
    id: str
    use: str
    inputs: dict[str, str]
    required: bool = True


class MenuyuktiConfig(BaseModel):
    version: int = 1
    data_requirements: list[DataRequirement] = Field(default_factory=list)


class SkillConfig(BaseModel):
    name: str
    description: str
    menuyukti: MenuyuktiConfig
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


def load_skill(path: Path | str) -> SkillConfig:
    """Load and validate a SKILL.md file."""
    p = Path(path)
    raw = p.read_text(encoding="utf-8")
    fm, body = parse_frontmatter(raw)
    menuyukti_raw = fm.get("menuyukti")
    if not isinstance(menuyukti_raw, dict):
        msg = "SKILL.md must define a menuyukti: mapping"
        raise ValueError(msg)
    return SkillConfig(
        name=str(fm.get("name", "")),
        description=str(fm.get("description", "")),
        menuyukti=MenuyuktiConfig.model_validate(menuyukti_raw),
        body=body,
    )
