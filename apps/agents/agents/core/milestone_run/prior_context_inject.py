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

    if "promotion_candidates" in wanted and "promotion_candidates" not in matched_ids:
        for row in rows:
            data = row.get("data")
            if isinstance(data, dict) and is_promotion_candidates_milestone_data(data):
                matched.append(
                    {
                        "title": row.get("title"),
                        "presetId": row.get("presetId"),
                        "data": data,
                    }
                )
                matched_ids.append("promotion_candidates")
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


def promotion_candidates_has_items(data: dict[str, Any]) -> bool:
    categories = data.get("categories")
    if not isinstance(categories, list):
        return False
    for block in categories:
        if not isinstance(block, dict):
            continue
        for key in ("starItems", "puzzleItems"):
            raw_items = block.get(key)
            if not isinstance(raw_items, list):
                continue
            for raw in raw_items:
                name = ""
                if isinstance(raw, str):
                    name = raw.strip()
                elif isinstance(raw, dict):
                    name = str(raw.get("name") or "").strip()
                if name:
                    return True
    return False


def _collect_promotion_candidates_data_candidates(
    rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    matched, _ = collect_matched_prior_rows(rows, frozenset({"promotion_candidates"}))
    candidates: list[dict[str, Any]] = []
    seen_ids: set[int] = set()
    for row in matched:
        data = row.get("data")
        if isinstance(data, dict) and is_promotion_candidates_milestone_data(data):
            candidates.append(data)
            seen_ids.add(id(data))

    if candidates:
        return candidates

    for row in rows:
        data = row.get("data")
        if not isinstance(data, dict) or not is_promotion_candidates_milestone_data(data):
            continue
        if id(data) in seen_ids:
            continue
        candidates.append(data)
    return candidates


def is_menu_tagger_milestone_data(data: object) -> bool:
    if not isinstance(data, dict):
        return False
    return data.get("taxonomyVersion") == "v2" and isinstance(data.get("items"), list)


def extract_promotion_candidates_row(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return the best matched prior promotion_candidates row, or ``None``."""
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    matched, _ = collect_matched_prior_rows(rows, frozenset({"promotion_candidates"}))
    if not matched:
        return None
    for row in reversed(matched):
        data = row.get("data")
        if isinstance(data, dict) and promotion_candidates_has_items(data):
            return row
    return matched[-1]


def extract_promotion_candidates_data(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return promotion_candidates ``data`` dict from prior milestones JSON, or ``None``."""
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    candidates = _collect_promotion_candidates_data_candidates(rows)
    if not candidates:
        return None
    for data in reversed(candidates):
        if promotion_candidates_has_items(data):
            return data
    return candidates[-1]


def promotion_candidates_prior_error_message(prior_milestones_json: str) -> str:
    """Actionable error when menu_tagger (or similar) cannot read prior promotion_candidates data."""
    base = "menu_tagger requires a prior promotion_candidates milestone with saved data"
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    if not rows:
        return (
            f"{base}. No earlier milestones were returned for this workflow step — "
            "place promotion_candidates before menu_tagger in the timeline."
        )

    titles = [str(row.get("title") or "Milestone").strip() or "Milestone" for row in rows]
    has_pc_preset = any(
        isinstance(row.get("presetId"), str)
        and row.get("presetId").strip() == "promotion_candidates"
        for row in rows
    )
    if not has_pc_preset:
        return (
            f"{base}. Earlier milestones are: {', '.join(titles)}. "
            "Add a promotion_candidates step before menu_tagger, run it successfully, "
            "then run menu_tagger again."
        )
    return (
        f"{base}. A promotion_candidates milestone appears earlier in the workflow "
        "but its saved preset data is missing or invalid — open that step, "
        "confirm the Data tab shows star/puzzle items, and re-run promotion_candidates."
    )


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


def is_dates_milestone_data(data: object) -> bool:
    if not isinstance(data, dict):
        return False
    start_date = str(data.get("startDate") or "").strip()
    end_date = str(data.get("endDate") or "").strip()
    public_holidays = data.get("publicHolidays")
    return bool(start_date and end_date and isinstance(public_holidays, list))


def extract_dates_row(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return the best matched prior dates row, or ``None``."""
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    matched, _ = collect_matched_prior_rows(rows, frozenset({"dates"}))
    if matched:
        return matched[-1]

    for row in reversed(rows):
        data = row.get("data")
        if isinstance(data, dict) and is_dates_milestone_data(data):
            return row
    return None


def extract_dates_data(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return dates ``data`` dict from prior milestones JSON, or ``None``."""
    row = extract_dates_row(prior_milestones_json)
    if row is None:
        return None
    data = row.get("data")
    if isinstance(data, dict) and is_dates_milestone_data(data):
        return data
    return None


def dates_prior_error_message(prior_milestones_json: str) -> str:
    """Actionable error when scheduler cannot read prior dates data."""
    base = "scheduler requires a prior dates milestone with saved start and end dates"
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    if not rows:
        return (
            f"{base}. No earlier milestones were returned for this workflow step — "
            "place dates before scheduler in the timeline."
        )

    titles = [str(row.get("title") or "Milestone").strip() or "Milestone" for row in rows]
    has_dates_preset = any(
        isinstance(row.get("presetId"), str) and row.get("presetId").strip() == "dates"
        for row in rows
    )
    if not has_dates_preset:
        return (
            f"{base}. Earlier milestones are: {', '.join(titles)}. "
            "Add a dates step before scheduler, set start and end dates, run it, "
            "then run scheduler again."
        )
    return (
        f"{base}. A dates milestone appears earlier in the workflow "
        "but its saved preset data is missing or invalid — open that step, "
        "confirm the Data tab shows start and end dates, and re-run dates."
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
