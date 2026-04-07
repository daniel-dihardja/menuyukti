"""Skill-driven domain agents: load SKILL.md, prefetch data, run LLM + tools."""

from agents_app.agents.domain.skill_runner.runner import run_skill_events

__all__ = ["run_skill_events"]
