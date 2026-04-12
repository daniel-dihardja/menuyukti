"""Skill-driven domain agents: load SKILL.md, prefetch data, run LLM + tools."""

from typing import Any

__all__ = ["run_skill_events"]


def __getattr__(name: str) -> Any:
    if name == "run_skill_events":
        from agents_app.agents.domain.skill_runner.runner import run_skill_events as _run

        return _run
    msg = f"module {__name__!r} has no attribute {name!r}"
    raise AttributeError(msg)
