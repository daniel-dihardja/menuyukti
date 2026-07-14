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

    if "menu_tagger" in wanted and "menu_tagger" not in matched_ids:
        for row in rows:
            data = row.get("data")
            if isinstance(data, dict) and is_menu_tagger_milestone_data(data):
                matched.append(
                    {
                        "title": row.get("title"),
                        "presetId": row.get("presetId"),
                        "data": data,
                    }
                )
                matched_ids.append("menu_tagger")
                break

    if "ig_plan" in wanted and "ig_plan" not in matched_ids:
        for row in rows:
            data = row.get("data")
            if isinstance(data, dict) and is_ig_plan_milestone_data(data):
                matched.append(
                    {
                        "title": row.get("title"),
                        "presetId": row.get("presetId"),
                        "data": data,
                    }
                )
                matched_ids.append("ig_plan")
                break

    return matched, matched_ids


def extract_restaurant_campaign_brief_data(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return campaign brief ``data`` dict from prior milestones JSON, or ``None``."""
    row = extract_restaurant_campaign_brief_row(prior_milestones_json)
    if row is None:
        return None
    data = row.get("data")
    if isinstance(data, dict) and is_campaign_brief_milestone_data(data):
        return data
    return None


def extract_restaurant_campaign_brief_row(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return the best matched prior campaign_brief row, or ``None``."""
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    matched, _ = collect_matched_prior_rows(rows, frozenset({"restaurant_campaign_brief"}))
    for row in reversed(matched):
        data = row.get("data")
        if isinstance(data, dict) and is_campaign_brief_milestone_data(data):
            return row
    return None


def campaign_brief_prior_error_message(
    prior_milestones_json: str, *, milestone_id: str = "milestone"
) -> str:
    """Actionable error when a milestone cannot read prior campaign brief data."""
    base = f"{milestone_id} requires a prior restaurant_campaign_brief milestone with saved data"
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    if not rows:
        return (
            f"{base}. No earlier milestones were returned for this workflow step — "
            "place restaurant_campaign_brief before this milestone in the timeline."
        )

    titles = [str(row.get("title") or "Milestone").strip() or "Milestone" for row in rows]
    has_campaign_brief_preset = any(
        (
            isinstance((preset_id := row.get("presetId")), str)
            and preset_id.strip() == "restaurant_campaign_brief"
        )
        or (
            isinstance(row.get("data"), dict) and is_campaign_brief_milestone_data(row["data"])  # type: ignore[index]
        )
        for row in rows
    )
    if not has_campaign_brief_preset:
        return (
            f"{base}. Earlier milestones are: {', '.join(titles)}. "
            "Add a restaurant_campaign_brief step before this milestone, run it successfully, "
            "then run this milestone again."
        )
    return (
        f"{base}. A restaurant_campaign_brief milestone appears earlier in the workflow "
        "but its saved preset data is missing or invalid — open that step, "
        "confirm the Data tab shows a campaign brief, and re-run restaurant_campaign_brief."
    )


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


def menu_tagger_has_items(data: dict[str, Any]) -> bool:
    items = data.get("items")
    if not isinstance(items, list):
        return False
    for raw in items:
        if not isinstance(raw, dict):
            continue
        name = str(raw.get("name") or raw.get("dishName") or "").strip()
        if name:
            return True
    return False


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


def is_ig_plan_milestone_data(data: object) -> bool:
    if not isinstance(data, dict):
        return False
    entries = data.get("entries")
    return isinstance(entries, list)


def ig_plan_has_entries(data: dict[str, Any]) -> bool:
    entries = data.get("entries")
    if not isinstance(entries, list):
        return False
    for raw in entries:
        if not isinstance(raw, dict):
            continue
        if str(raw.get("slotKey") or "").strip():
            return True
    return False


def extract_ig_plan_row(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return the best matched prior ig_plan row, or ``None``."""
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    matched, _ = collect_matched_prior_rows(rows, frozenset({"ig_plan"}))
    if not matched:
        return None
    for row in reversed(matched):
        data = row.get("data")
        if isinstance(data, dict) and ig_plan_has_entries(data):
            return row
    return matched[-1]


def extract_ig_plan_data(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return ig_plan ``data`` dict from prior milestones JSON, or ``None``."""
    row = extract_ig_plan_row(prior_milestones_json)
    if row is None:
        return None
    data = row.get("data")
    if isinstance(data, dict) and is_ig_plan_milestone_data(data):
        return data
    return None


def ig_plan_prior_error_message(
    prior_milestones_json: str, *, milestone_id: str = "ig_menu_picker"
) -> str:
    """Actionable error when ig_menu_picker cannot read prior ig_plan data."""
    base = f"{milestone_id} requires a prior ig_plan milestone with saved entries"
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    if not rows:
        return (
            f"{base}. No earlier milestones were returned for this workflow step — "
            "place ig_plan before ig_menu_picker in the timeline."
        )

    titles = [str(row.get("title") or "Milestone").strip() or "Milestone" for row in rows]
    has_ig_plan_preset = any(
        isinstance((preset_id := row.get("presetId")), str) and preset_id.strip() == "ig_plan"
        for row in rows
    )
    if not has_ig_plan_preset:
        return (
            f"{base}. Earlier milestones are: {', '.join(titles)}. "
            "Add an ig_plan step before ig_menu_picker, run it successfully, "
            "then run ig_menu_picker again."
        )
    return (
        f"{base}. An ig_plan milestone appears earlier in the workflow "
        "but its saved preset data is missing or has no entries — open that step, "
        "confirm the Data tab shows weekly slot strategy entries, and re-run ig_plan."
    )


def ig_menu_picker_has_entries(data: dict[str, Any]) -> bool:
    entries = data.get("entries")
    if not isinstance(entries, list):
        return False
    for raw in entries:
        if not isinstance(raw, dict):
            continue
        slot_key = str(raw.get("slotKey") or "").strip()
        menu_items = raw.get("menuItems")
        if slot_key and isinstance(menu_items, list) and len(menu_items) > 0:
            return True
    return False


def extract_ig_menu_picker_row(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return the best matched prior ig_menu_picker row, or ``None``."""
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    matched, _ = collect_matched_prior_rows(rows, frozenset({"ig_menu_picker"}))
    if not matched:
        return None
    for row in reversed(matched):
        data = row.get("data")
        if isinstance(data, dict) and ig_menu_picker_has_entries(data):
            return row
    return matched[-1]


def extract_ig_menu_picker_data(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return ig_menu_picker ``data`` dict from prior milestones JSON, or ``None``."""
    row = extract_ig_menu_picker_row(prior_milestones_json)
    if row is None:
        return None
    data = row.get("data")
    if isinstance(data, dict) and ig_menu_picker_has_entries(data):
        return data
    return None


def is_ig_format_milestone_data(data: dict[str, Any]) -> bool:
    entries = data.get("entries")
    if not isinstance(entries, list):
        return False
    return any(
        isinstance(row, dict) and "menuItems" in row and "type" in row for row in entries
    )


def ig_format_has_entries(data: dict[str, Any]) -> bool:
    entries = data.get("entries")
    if not isinstance(entries, list):
        return False
    for raw in entries:
        if not isinstance(raw, dict):
            continue
        slot_key = str(raw.get("slotKey") or "").strip()
        menu_items = raw.get("menuItems")
        fmt_type = str(raw.get("type") or "").strip()
        if slot_key and fmt_type and isinstance(menu_items, list) and len(menu_items) > 0:
            return True
    return False


def extract_ig_format_row(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return the best matched prior ig_format row, or ``None``."""
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    matched, _ = collect_matched_prior_rows(rows, frozenset({"ig_format"}))
    if not matched:
        return None
    for row in reversed(matched):
        data = row.get("data")
        if isinstance(data, dict) and ig_format_has_entries(data):
            return row
    return matched[-1]


def extract_ig_format_data(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return ig_format ``data`` dict from prior milestones JSON, or ``None``."""
    row = extract_ig_format_row(prior_milestones_json)
    if row is None:
        return None
    data = row.get("data")
    if isinstance(data, dict) and ig_format_has_entries(data):
        return data
    return None


def ig_format_prior_error_message(
    prior_milestones_json: str, *, milestone_id: str = "ig_text"
) -> str:
    """Actionable error when ig_text cannot read prior ig_format data."""
    base = (
        f"{milestone_id} requires a prior ig_format milestone with saved entries "
        "that include menuItems and type"
    )
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    if not rows:
        return (
            f"{base}. No earlier milestones were returned for this workflow step — "
            "place ig_format before ig_text in the timeline."
        )

    titles = [str(row.get("title") or "Milestone").strip() or "Milestone" for row in rows]
    has_format_preset = any(
        isinstance((preset_id := row.get("presetId")), str) and preset_id.strip() == "ig_format"
        for row in rows
    )
    if not has_format_preset:
        return (
            f"{base}. Earlier milestones are: {', '.join(titles)}. "
            "Add an ig_format step before ig_text, run it successfully, "
            "then run ig_text again."
        )
    return (
        f"{base}. An ig_format milestone appears earlier in the workflow "
        "but its saved preset data is missing or has no entries with menuItems and type — "
        "open that step, confirm the Data tab shows formatted slots, and re-run ig_format."
    )


def ig_menu_picker_prior_error_message(
    prior_milestones_json: str, *, milestone_id: str = "ig_format"
) -> str:
    """Actionable error when ig_format cannot read prior ig_menu_picker data."""
    base = (
        f"{milestone_id} requires a prior ig_menu_picker milestone with saved entries "
        "that include menuItems"
    )
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    if not rows:
        return (
            f"{base}. No earlier milestones were returned for this workflow step — "
            "place ig_menu_picker before ig_format in the timeline."
        )

    titles = [str(row.get("title") or "Milestone").strip() or "Milestone" for row in rows]
    has_menu_picker_preset = any(
        isinstance((preset_id := row.get("presetId")), str)
        and preset_id.strip() == "ig_menu_picker"
        for row in rows
    )
    if not has_menu_picker_preset:
        return (
            f"{base}. Earlier milestones are: {', '.join(titles)}. "
            "Add an ig_menu_picker step before ig_format, run it successfully, "
            "then run ig_format again."
        )
    return (
        f"{base}. An ig_menu_picker milestone appears earlier in the workflow "
        "but its saved preset data is missing or has no entries with menuItems — "
        "open that step, confirm the Data tab shows slots with dishes, and re-run "
        "ig_menu_picker."
    )


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
        isinstance((preset_id := row.get("presetId")), str)
        and preset_id.strip() == "promotion_candidates"
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
    """Return the best matched prior menu_tagger row, or ``None``."""
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    matched, _ = collect_matched_prior_rows(rows, frozenset({"menu_tagger"}))
    if not matched:
        return None
    for row in reversed(matched):
        data = row.get("data")
        if isinstance(data, dict) and menu_tagger_has_items(data):
            return row
    return matched[-1]


def extract_menu_tagger_data(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return menu_tagger ``data`` dict from prior milestones JSON, or ``None``."""
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    matched, _ = collect_matched_prior_rows(rows, frozenset({"menu_tagger"}))
    candidates: list[dict[str, Any]] = []
    seen_ids: set[int] = set()
    for row in matched:
        data = row.get("data")
        if isinstance(data, dict) and is_menu_tagger_milestone_data(data):
            candidates.append(data)
            seen_ids.add(id(data))

    if not candidates:
        for row in rows:
            data = row.get("data")
            if not isinstance(data, dict) or not is_menu_tagger_milestone_data(data):
                continue
            if id(data) in seen_ids:
                continue
            candidates.append(data)

    if not candidates:
        return None
    for data in reversed(candidates):
        if menu_tagger_has_items(data):
            return data
    return candidates[-1]


def menu_tagger_prior_error_message(
    prior_milestones_json: str, *, milestone_id: str = "milestone"
) -> str:
    """Actionable error when a milestone cannot read prior menu_tagger data."""
    base = f"{milestone_id} requires a prior menu_tagger milestone with saved data"
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    if not rows:
        return (
            f"{base}. No earlier milestones were returned for this workflow step — "
            "place menu_tagger before this milestone in the timeline."
        )

    titles = [str(row.get("title") or "Milestone").strip() or "Milestone" for row in rows]
    has_tagger_preset = any(
        isinstance((preset_id := row.get("presetId")), str) and preset_id.strip() == "menu_tagger"
        for row in rows
    )
    if not has_tagger_preset:
        return (
            f"{base}. Earlier milestones are: {', '.join(titles)}. "
            "Add a menu_tagger step before this milestone, run it successfully, "
            "then run this milestone again."
        )
    return (
        f"{base}. A menu_tagger milestone appears earlier in the workflow "
        "but its saved preset data is missing or invalid — open that step, "
        "confirm the Data tab shows tagged items, and re-run menu_tagger."
    )


def is_menu_clusterer_milestone_data(data: object) -> bool:
    if not isinstance(data, dict):
        return False
    food_leads = data.get("foodLeads")
    groups = data.get("groups")
    return isinstance(food_leads, list) and isinstance(groups, list)


def menu_clusterer_has_food_leads(data: dict[str, Any]) -> bool:
    food_leads = data.get("foodLeads")
    if not isinstance(food_leads, list):
        return False
    for raw in food_leads:
        if not isinstance(raw, dict):
            continue
        if str(raw.get("name") or "").strip():
            return True
    return False


def extract_menu_clusterer_row(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return the best matched prior menu_clusterer row, or ``None``."""
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    matched, _ = collect_matched_prior_rows(rows, frozenset({"menu_clusterer"}))
    if not matched:
        return None
    for row in reversed(matched):
        data = row.get("data")
        if isinstance(data, dict) and menu_clusterer_has_food_leads(data):
            return row
    return matched[-1]


def extract_menu_clusterer_data(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return menu_clusterer ``data`` dict from prior milestones JSON, or ``None``."""
    row = extract_menu_clusterer_row(prior_milestones_json)
    if row is None:
        return None
    data = row.get("data")
    if isinstance(data, dict) and is_menu_clusterer_milestone_data(data):
        return data
    return None


def menu_clusterer_prior_error_message(
    prior_milestones_json: str, *, milestone_id: str = "milestone"
) -> str:
    """Actionable error when a milestone cannot read prior menu_clusterer data."""
    base = f"{milestone_id} requires a prior menu_clusterer milestone with saved food groups"
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    if not rows:
        return (
            f"{base}. No earlier milestones were returned for this workflow step — "
            "place menu_clusterer before this milestone in the timeline."
        )

    titles = [str(row.get("title") or "Milestone").strip() or "Milestone" for row in rows]
    has_menu_clusterer_preset = any(
        isinstance((preset_id := row.get("presetId")), str)
        and preset_id.strip() == "menu_clusterer"
        for row in rows
    )
    if not has_menu_clusterer_preset:
        return (
            f"{base}. Earlier milestones are: {', '.join(titles)}. "
            "Add a menu_clusterer step before this milestone, run it successfully, "
            "then run this milestone again."
        )
    return (
        f"{base}. A menu_clusterer milestone appears earlier in the workflow "
        "but its saved preset data is missing or invalid — open that step, "
        "confirm the Data tab shows food groups, and re-run menu_clusterer."
    )


def is_post_lineup_milestone_data(data: object) -> bool:
    if not isinstance(data, dict):
        return False
    posts = data.get("posts")
    return isinstance(posts, list) and len(posts) > 0


def extract_post_lineup_row(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return the first matched prior post_lineup row, or ``None``."""
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    matched, _ = collect_matched_prior_rows(rows, frozenset({"post_lineup"}))
    return matched[0] if matched else None


def extract_post_lineup_data(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return post_lineup ``data`` dict from prior milestones JSON, or ``None``."""
    row = extract_post_lineup_row(prior_milestones_json)
    if row is None:
        return None
    data = row.get("data")
    if isinstance(data, dict) and is_post_lineup_milestone_data(data):
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


def is_story_lineup_milestone_data(data: object) -> bool:
    if not isinstance(data, dict):
        return False
    stories = data.get("stories")
    return isinstance(stories, list)


def extract_story_lineup_row(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return the first matched prior story_lineup row, or ``None``."""
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    matched, _ = collect_matched_prior_rows(rows, frozenset({"story_lineup"}))
    return matched[0] if matched else None


def extract_story_lineup_data(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return story_lineup ``data`` dict from prior milestones JSON, or ``None``."""
    row = extract_story_lineup_row(prior_milestones_json)
    if row is None:
        return None
    data = row.get("data")
    if isinstance(data, dict) and is_story_lineup_milestone_data(data):
        return data
    return None


def is_reel_lineup_milestone_data(data: object) -> bool:
    if not isinstance(data, dict):
        return False
    reels = data.get("reels")
    return isinstance(reels, list) and len(reels) > 0


def extract_reel_lineup_row(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return the first matched prior reel_lineup row, or ``None``."""
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    matched, _ = collect_matched_prior_rows(rows, frozenset({"reel_lineup"}))
    return matched[0] if matched else None


def extract_reel_lineup_data(prior_milestones_json: str) -> dict[str, Any] | None:
    """Return reel_lineup ``data`` dict from prior milestones JSON, or ``None``."""
    row = extract_reel_lineup_row(prior_milestones_json)
    if row is None:
        return None
    data = row.get("data")
    if isinstance(data, dict) and is_reel_lineup_milestone_data(data):
        return data
    return None


def story_lineup_prior_error_message(prior_milestones_json: str) -> str:
    """Actionable error when scheduler cannot read prior story_lineup data."""
    base = "scheduler requires a prior story_lineup milestone with saved stories"
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    if not rows:
        return (
            f"{base}. No earlier milestones were returned for this workflow step — "
            "place story_lineup before scheduler in the timeline."
        )

    titles = [str(row.get("title") or "Milestone").strip() or "Milestone" for row in rows]
    has_story_lineup_preset = any(
        isinstance((preset_id := row.get("presetId")), str) and preset_id.strip() == "story_lineup"
        for row in rows
    )
    if not has_story_lineup_preset:
        return (
            f"{base}. Earlier milestones are: {', '.join(titles)}. "
            "Add a story_lineup step before scheduler, run it successfully, "
            "then run scheduler again."
        )
    return (
        f"{base}. A story_lineup milestone appears earlier in the workflow "
        "but its saved preset data is missing or invalid — open that step, "
        "confirm the Data tab shows stories, and re-run story_lineup."
    )


def dates_prior_error_message(
    prior_milestones_json: str, *, milestone_id: str = "milestone"
) -> str:
    """Actionable error when a milestone cannot read prior dates data."""
    base = f"{milestone_id} requires a prior dates milestone with saved start and end dates"
    rows = _parse_prior_milestone_rows(prior_milestones_json)
    if not rows:
        return (
            f"{base}. No earlier milestones were returned for this workflow step — "
            "place dates before this milestone in the timeline."
        )

    titles = [str(row.get("title") or "Milestone").strip() or "Milestone" for row in rows]
    has_dates_preset = any(
        isinstance((preset_id := row.get("presetId")), str) and preset_id.strip() == "dates"
        for row in rows
    )
    if not has_dates_preset:
        return (
            f"{base}. Earlier milestones are: {', '.join(titles)}. "
            "Add a dates step before this milestone, set start and end dates, run it, "
            "then run this milestone again."
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
