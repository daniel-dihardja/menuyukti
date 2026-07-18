"""Tests for workflow catalog prompt injection."""

from agents_app.agents.core.chat.prompts import SYSTEM_PROMPT, build_system_prompt


def test_build_system_prompt_without_catalog() -> None:
    out = build_system_prompt()
    assert out == SYSTEM_PROMPT
    assert "## Workflow milestone catalog" not in out
    assert "use it as the source of truth" in out
    assert "Call get_workflow_overview only if the catalog is missing" in out
    assert "call get_workflow_overview when listing" not in out


def test_build_system_prompt_with_catalog() -> None:
    catalog = "# Workflow overview\n\n## 1. Campaign Brief\n- **id**: 42\n"
    out = build_system_prompt(workflow_catalog=catalog)
    assert out.startswith(SYSTEM_PROMPT)
    assert "## Workflow milestone catalog" in out
    assert "# Workflow overview" in out
    assert "**id**: 42" in out


def test_build_system_prompt_ignores_blank_catalog() -> None:
    assert build_system_prompt(workflow_catalog="   ") == SYSTEM_PROMPT
    assert build_system_prompt(workflow_catalog="") == SYSTEM_PROMPT
