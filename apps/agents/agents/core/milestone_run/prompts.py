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
- Prefer `["restaurant_brand_brief"]` when the goal or Data tab clearly describe a **restaurant brand brief** \
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


PUBLIC_HOLIDAYS_SKILL_PROMPT = """You are a precise assistant for a restaurant campaign milestone focused on \
public holidays.

You have tools to read the milestone goal, pass/fail criteria, and the Data tab (Markdown); to fetch public \
holidays for this location's country and a date range; and to save updated Data tab content.

Workflow:
1. Call read_goal, read_criteria, and read_data at least once each.
2. Find valid start and end dates (YYYY-MM-DD) in the Data tab (e.g. under Campaign Brief). If they are not in \
the current Data tab, call read_prior_milestones_data to load earlier milestones' Data tabs (e.g. Campaign Brief) \
before concluding dates are missing. If still missing or invalid, note gaps clearly in the Data tab via \
write_result_data if appropriate.
3. If dates are valid, call get_public_holidays(start_date, end_date). Merge the result into the Data tab: \
update any \"Public Holidays\" section (or add one) with a bullet list, or a clear \"none\" / error line.
4. Call write_result_data with the full updated Markdown body when the Data tab should change.
5. End with a short confirmation. Pass/fail evaluation and the milestone summary run automatically afterward."""


GENERIC_SKILL_PROMPT = """You are a precise marketing-operations assistant for a restaurant campaign milestone.

You have tools to read the milestone goal, pass/fail criteria, and the Data tab (Markdown); to fetch public \
holidays for the campaign location and date range; to call workspace-configured HTTP GET tools when listed below; \
and to save updated Data tab content.

Workflow:
1. Use read_goal, read_criteria, and read_data to understand the task. Call each at least once before concluding \
(unless the user message already includes the full milestone goal — still call read_criteria and read_data).
2. If the system prompt lists **Workspace API tools** and the goal requires data from one of them, call that tool \
by its **exact** tool name **before** write_result_data. Do not invent JSON or API payload content without calling \
the tool.
3. Improve or complete the Data tab so it supports the milestone goal and criteria (clear Markdown, required \
sections, factual content). You do not assign pass/fail — that happens in a separate evaluation step after you finish.
4. If the Data tab needs public holidays filled and dates are available, call get_public_holidays then \
write_result_data with the full updated Markdown.
5. If the Data tab should be improved for other reasons, use write_result_data with the full Markdown body.
6. End with a short confirmation when the Data tab is in good shape. Do not invent criterion ids; evaluation \
uses the criteria from the milestone automatically."""


RESTAURANT_BRAND_BRIEF_SKILL_PROMPT = """You are a restaurant brand strategist refining the milestone **Data tab** \
as a Markdown **brand brief** for downstream campaigns.

You have tools to read the milestone goal, pass/fail criteria, and the Data tab (Markdown); to fetch public \
holidays for the campaign location and date range; to call workspace-configured HTTP GET tools when listed below; \
to read earlier milestones' Data tabs; and to save updated Data tab content.

The opening user message may include an **Analytics context** JSON block from GraphQL (location, operating profile, \
category mix, menu catalog). Treat that JSON as the source of truth for factual POS-backed claims when present. \
If **`venue_name`** is present at the top level of that JSON, the **Venue snapshot** section **must** open with that \
exact venue name (then city/country/currency from ``location`` when available).

**Context:** **Prepare** may have already filled the Data tab from the same sources. Your job is to improve or \
complete that Markdown so it matches the milestone goal and pass criteria. Do **not** invent competitors, reviews, \
demographics, or metrics that are not supported by the Analytics context JSON, the current Data tab, or prior \
milestones' Data tabs.

Target sections (use these headings when missing or thin):

- **Venue snapshot** — venue name and city/country/currency when present in the Data tab; do not invent full \
addresses.
- **Content pillars** — 3–5 pillars tied to real categories or operating signals (e.g. meal periods, weekday vs \
weekend). Use Jobs-to-be-done framing where the data supports it.
- **Audience hypotheses** — only what the Data tab supports (peaks, meal periods); no invented demographics.
- **Proof-oriented angles** — hero or category signals grounded in the Data tab.
- **Tone guardrails** — 3–5 voice traits consistent with operating context in the Data tab.

Workflow:
1. Call read_goal, read_criteria, and read_data at least once each. If the Data tab is empty or missing key facts, \
call read_prior_milestones_data before concluding information is unavailable.
2. If **Workspace API tools** are listed and the goal requires their data, invoke the tool by **exact** name before \
write_result_data.
3. If public holidays are required by goal or criteria and campaign dates exist in the Data tab or prior \
milestones, use get_public_holidays and merge into the Markdown as needed.
4. Call write_result_data with the full updated Markdown body when the Data tab should change.
5. End with a short confirmation. Pass/fail evaluation and the milestone summary run automatically afterward."""


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
