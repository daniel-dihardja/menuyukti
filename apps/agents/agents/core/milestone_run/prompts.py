"""Prompts for skill selection and per-skill milestone run agents."""

from __future__ import annotations

import json
from typing import Any

SKILL_SELECTOR_SYSTEM = """You are a routing assistant for a restaurant campaign milestone run.

Given the milestone goal, pass/fail criteria, and the current Data tab (Markdown), choose an **ordered list** \
of one or two skill ids from the provided list. The run executes them in order: skills may only update the \
Data tab (Markdown). After all skills finish, the system **automatically** evaluates pass criteria against the \
Data tab, writes the milestone summary, and persists the result — skills do not do that.

Rules:
- Prefer `["public_holidays", "generic"]` (in that order) when the goal or criteria require **both** (a) listing \
or confirming public holidays for a date range **and** (b) broader work on the brief (e.g. objectives, budget, \
summary) beyond holidays alone.
- Prefer `["public_holidays"]` when only holidays listing/confirmation is needed.
- Prefer `["generic"]` for standard Data preparation when holidays are not a distinct requirement.
- Prefer `["promotion_candidates"]` when the goal or criteria require **promotion candidate dishes** or **social post** \
ideas grounded in **POS/analytics** (menu performance, Instagram signals), typically two Markdown variations with \
named menu lines from data.
- Prefer `["restaurant_brand_brief"]` when the goal or Data tab clearly describe a **brand brief** \
(venue snapshot, content pillars, audience hypotheses, proof angles, tone guardrails) as the main deliverable.
- Use at most **two** ids. Do not duplicate the same id.
- Each id must be one of the listed keys exactly (underscores, lowercase)."""


def skill_selector_human_message(
    goal: str,
    criteria: list[dict[str, str]],
    raw_data: str,
    skills_markdown: str,
) -> str:
    """Build the user message for structured skill selection."""
    crit_json = json.dumps(criteria, ensure_ascii=False, indent=2)
    return f"""## Available skills

{skills_markdown}

## Milestone goal

{goal}

## Pass criteria (JSON)

{crit_json}

## Data tab (Markdown)

{raw_data}
"""


INTERMEDIATE_SKILL_PROMPT_SUFFIX = """

**Multi-skill run (intermediate step):** Complete your Data-tab work (read context, fetch holidays if needed, \
save via write_result_data), then output a one-sentence confirmation and stop. Do not call further tools after \
write_result_data."""


def workspace_adapter_tools_prompt_suffix(adapters: list[dict[str, Any]]) -> str:
    """Appendix when the location's workspace has API adapter tools (GET; LangChain name = tool_key)."""
    lines: list[str] = []
    for row in adapters:
        if not isinstance(row, dict):
            continue
        key = row.get("tool_key")
        desc = row.get("description", "")
        if not isinstance(key, str) or not key.strip():
            continue
        d = desc.strip() if isinstance(desc, str) else ""
        lines.append(f"- **`{key.strip()}`** — {d}" if d else f"- **`{key.strip()}`**")
    if not lines:
        return ""
    bullet = "\n".join(lines)
    example_key = next(
        (
            str(r.get("tool_key", "")).strip()
            for r in adapters
            if isinstance(r, dict) and str(r.get("tool_key", "")).strip()
        ),
        "tool_key",
    )
    return f"""

**Workspace API tools (parameterless HTTP GET; invoke using the exact tool name, e.g. `{example_key}`):**

{bullet}

**Mandatory when applicable:** If the milestone goal names one of these tools (including in backticks) or asks to \
fetch JSON from the workspace feed, you **must** invoke that tool by **exact name** at least once **before** \
write_result_data. Merge the response into the Data tab as Markdown. Never invent feed data without calling the tool. \
If the tool returns an error message, write a short note in the Data tab."""


def execute_skill_task_message(skill_id: str, skill_name: str, goal: str = "") -> str:
    """Human message that starts the execute-skill ReAct agent."""
    base = (
        f"Run this milestone using the selected skill `{skill_id}` ({skill_name}). "
        "Follow the system instructions and persist the Data tab with the tools."
    )
    g = goal.strip()
    if not g:
        return base
    return f"{base}\n\n## Milestone goal\n\n{g}"
