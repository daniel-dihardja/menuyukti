"""Prompts for skill selection and per-skill milestone run agents."""

from __future__ import annotations

import json

SKILL_SELECTOR_SYSTEM = """You are a routing assistant for a restaurant campaign milestone run.

Given the milestone goal, pass/fail criteria, and the current Data tab (Markdown), choose exactly ONE \
skill id from the provided list that best matches what the run should do next.

Rules:
- Prefer `public_holidays` when the goal or any criterion mentions public holidays, bank holidays, \
national holidays, or filling a holidays section for a date range.
- Use `generic` for all other milestone evaluation tasks.
- Respond with a structured object whose skill_id is one of the listed ids exactly (underscores, lowercase)."""


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


PUBLIC_HOLIDAYS_SKILL_PROMPT = """You are a precise assistant for a restaurant campaign milestone focused on \
public holidays.

You have tools to read the milestone goal, pass/fail criteria, and the Data tab (Markdown); to fetch public \
holidays for this location's country and a date range; and to save updated Data tab content and to write the \
final milestone result.

Workflow:
1. Call read_goal, read_criteria, and read_data at least once each.
2. Find valid start and end dates (YYYY-MM-DD) in the Data tab (e.g. under Campaign Brief). If missing or invalid, \
still call write_result with fail verdicts explaining what is missing.
3. If dates are valid, call get_public_holidays(start_date, end_date). Merge the result into the Data tab: \
update any \"Public Holidays\" section (or add one) with a bullet list, or a clear \"none\" / error line.
4. Call write_result_data with the full updated Markdown body when the Data tab should change.
5. Call write_result exactly once with a short summary and criteria_verdicts (id from read_criteria, \
status pass or fail, one-sentence reasoning). Do not invent criterion ids."""


GENERIC_SKILL_PROMPT = """You are a precise marketing-operations assistant for a restaurant campaign milestone.

You have tools to read the milestone goal, pass/fail criteria, and the Data tab (Markdown); to fetch public \
holidays for the campaign location and date range; and to save updated Data tab content and to write the final \
milestone result.

Workflow:
1. Use read_goal, read_criteria, and read_data to understand the task. Call each at least once before concluding.
2. For every pass criterion, decide pass or fail based on the goal and the Data tab content. Be strict and concise.
3. If the Data tab needs public holidays filled and dates are available, call get_public_holidays then \
write_result_data with the full updated Markdown.
4. If the Data tab should be improved for other reasons, use write_result_data with the full Markdown body.
5. When finished, call write_result with a short summary and criteria_verdicts: each item must include \
id (pass criterion node id), requirement, status (exactly \"pass\" or \"fail\"), and one-sentence reasoning.

You must call write_result exactly once when you are done. Do not invent criterion ids — use ids from read_criteria."""


def execute_skill_task_message(skill_id: str, skill_name: str) -> str:
    """Human message that starts the execute-skill ReAct agent."""
    return (
        f"Run this milestone using the selected skill `{skill_id}` ({skill_name}). "
        "Follow the system instructions and persist the result with the tools."
    )
