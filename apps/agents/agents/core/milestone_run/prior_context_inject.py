"""Build injected prior-milestone markdown for milestone-run system prompts."""

from __future__ import annotations

import json
from typing import Any

from agents_app.agents.core.milestone_run.prior_context_pack import (
    is_campaign_brief_milestone_data,
)


def build_injected_prior_context_markdown(
    prior_milestones_json: str,
    inject_prior_presets: tuple[str, ...],
) -> tuple[str, list[str]]:
    """Select prior rows matching ``inject_prior_presets`` and return markdown + matched ids for logs.

    Prefers ``presetId`` on each prior row (from GraphQL). For ``restaurant_campaign_brief``, falls back to
    the first row whose ``data`` matches saved campaign_brief shape when no ``presetId`` match exists.
    """
    if not inject_prior_presets:
        return "", []
    raw = prior_milestones_json.strip()
    if not raw:
        return "", []
    try:
        rows = json.loads(raw)
    except json.JSONDecodeError:
        return "", []
    if not isinstance(rows, list):
        return "", []

    wanted = frozenset(inject_prior_presets)
    matched: list[dict[str, Any]] = []
    matched_ids: list[str] = []

    for row in rows:
        if not isinstance(row, dict):
            continue
        pid = row.get("presetId")
        if isinstance(pid, str) and pid.strip() and pid.strip() in wanted:
            matched.append(
                {
                    "title": row.get("title"),
                    "presetId": pid.strip(),
                    "data": row.get("data"),
                }
            )
            if pid.strip() not in matched_ids:
                matched_ids.append(pid.strip())

    if "restaurant_campaign_brief" in wanted and "restaurant_campaign_brief" not in matched_ids:
        for row in rows:
            if not isinstance(row, dict):
                continue
            data = row.get("data")
            if isinstance(data, dict) and is_campaign_brief_milestone_data(data):
                matched.append(
                    {
                        "title": row.get("title"),
                        "presetId": row.get("presetId"),
                        "data": data,
                    }
                )
                matched_ids.append("restaurant_campaign_brief")
                break

    if not matched:
        return "", []

    try:
        body = json.dumps(matched, ensure_ascii=False, indent=2)
    except (TypeError, ValueError):
        body = "[]"

    md = (
        "## Prior milestone context (injected)\n\n"
        "Use this prior milestone data to inform your work. Ground facts (dates, holidays, "
        "menu names, promotion ideas) in these objects; do not contradict them without noting "
        "assumptions.\n\n"
        f"```json\n{body}\n```"
    )
    return md, matched_ids
