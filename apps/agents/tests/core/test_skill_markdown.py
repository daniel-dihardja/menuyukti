"""Tests for milestone run SKILL.md parsing."""

from __future__ import annotations

from pathlib import Path

import pytest
from agents_app.agents.core.milestone_run.skill_markdown import load_skill_markdown


def test_load_skill_markdown_extra_tools_omitted(tmp_path: Path) -> None:
    p = tmp_path / "SKILL.md"
    p.write_text(
        "---\nname: t\ndescription: d\n---\n\nbody\n",
        encoding="utf-8",
    )
    md = load_skill_markdown(p)
    assert md.extra_tools == []


def test_load_skill_markdown_extra_tools_list(tmp_path: Path) -> None:
    p = tmp_path / "SKILL.md"
    p.write_text(
        "---\nname: t\ndescription: d\nextra_tools:\n  - get_public_holidays\n---\n\nbody\n",
        encoding="utf-8",
    )
    md = load_skill_markdown(p)
    assert md.extra_tools == ["get_public_holidays"]


def test_load_skill_markdown_extra_tools_not_list_raises(tmp_path: Path) -> None:
    p = tmp_path / "SKILL.md"
    p.write_text(
        "---\nname: t\ndescription: d\nextra_tools: get_public_holidays\n---\n\nbody\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="extra_tools must be a list"):
        load_skill_markdown(p)
