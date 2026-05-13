"""Build injected prior-milestone markdown for milestone-run system prompts."""

from __future__ import annotations

import json
from typing import Any

from agents_app.agents.core.milestone_run.prior_context_pack import (
    is_campaign_brief_milestone_data,
)


def _parse_prior_milestone_rows(prior_milestones_json: str) -> list[dict[str, Any]]:
    raw = prior_milestones_json.strip()
    if not raw:
        return []
    try:
        rows = json.loads(raw)
    except json.JSONDecodeError:
        return []
    if not isinstance(rows, list):
        return []
    return [row for row in rows if isinstance(row, dict)]


def collect_matched_prior_rows(
    rows: list[dict[str, Any]],
    wanted: frozenset[str],
) -> tuple[list[dict[str, Any]], list[str]]:
    """Select prior rows matching ``wanted`` preset ids (same rules as injected markdown).

    For ``restaurant_campaign_brief``, falls back to the first row whose ``data`` matches saved
    campaign_brief shape when no ``presetId`` match exists.
    """
    matched: list[dict[str, Any]] = []
    matched_ids: list[str] = []

    for row in rows:
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

    return matched, matched_ids


def extract_restaurant_campaign_brief_data(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return campaign brief ``data`` dict from prior milestones JSON, or ``None``."""
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    matched, _ = collect_matched_prior_rows(rows, frozenset({"restaurant_campaign_brief"}))
    for row in matched:
        data = row.get("data")
        if isinstance(data, dict) and is_campaign_brief_milestone_data(data):
            return data
    return None


def is_promotion_candidates_milestone_data(data: object) -> bool:
    if not isinstance(data, dict):
        return False
    categories = data.get("categories")
    return isinstance(categories, list)


def is_menu_tagger_milestone_data(data: object) -> bool:
    if not isinstance(data, dict):
        return False
    return data.get("taxonomyVersion") == "v2" and isinstance(data.get("items"), list)


def extract_promotion_candidates_row(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return the first matched prior promotion_candidates row, or ``None``."""
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    matched, _ = collect_matched_prior_rows(rows, frozenset({"promotion_candidates"}))
    return matched[0] if matched else None


def extract_promotion_candidates_data(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return promotion_candidates ``data`` dict from prior milestones JSON, or ``None``."""
    row = extract_promotion_candidates_row(prior_milestones_json)
    if row is None:
        return None
    data = row.get("data")
    if isinstance(data, dict) and is_promotion_candidates_milestone_data(data):
        return data
    return None


def extract_menu_tagger_row(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return the first matched prior menu_tagger row, or ``None``."""
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    matched, _ = collect_matched_prior_rows(rows, frozenset({"menu_tagger"}))
    return matched[0] if matched else None


def extract_menu_tagger_data(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return menu_tagger ``data`` dict from prior milestones JSON, or ``None``."""
    row = extract_menu_tagger_row(prior_milestones_json)
    if row is None:
        return None
    data = row.get("data")
    if isinstance(data, dict) and is_menu_tagger_milestone_data(data):
        return data
    return None


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
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    matched, matched_ids = collect_matched_prior_rows(rows, frozenset(inject_prior_presets))

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
