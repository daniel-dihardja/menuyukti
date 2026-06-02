"""Build food menu clusters from menu tagger items and LLM draft."""

from __future__ import annotations

import contextlib
import re
import unicodedata
from typing import Any, Literal, Protocol

MENU_CLUSTERER_PROFILE_ID: Literal["hook_reel"] = "hook_reel"
MENU_CLUSTERER_TOP_LEADS = 5
MENU_CLUSTERER_MIN_GROUP_COUNT = 4
MENU_CLUSTERER_DEFAULT_GROUP_COUNT = 4
MENU_CLUSTERER_MAX_GROUP_COUNT = 8
# Backward-compatible alias used in older call sites/tests.
MENU_CLUSTERER_MIN_GROUPS = MENU_CLUSTERER_MIN_GROUP_COUNT
MENU_CLUSTERER_GROUP_MAX_SIZE = 5
MENU_CLUSTERER_CLUSTER_DESCRIPTION_MIN_LEN = 40
_DEFAULT_STRATEGY_FOCUS = "weekday_lunch"
_DEFAULT_CORE_MESSAGE = "Weekday lunch offer for nearby workers and small groups."
_DEFAULT_OFFER_WINDOW = "11:00-14:00"
_CREATIVE_ROLE_SEQUENCE = (
    "hero",
    "proof",
    "variety",
    "value",
    "group_lunch_angle",
)


class MenuClustererClusterDraftLike(Protocol):
    themeLabel: str
    leadItemName: str
    supportingItemNames: list[str]
    clusterDescription: str


def _is_food_item(item: dict[str, Any]) -> bool:
    tags = item.get("tags")
    if not isinstance(tags, dict):
        return False
    return str(tags.get("kind") or "").strip() == "food"


def food_items_only(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [item for item in items if _is_food_item(item)]


def _item_popularity(item: dict[str, Any]) -> float:
    popularity_raw = item.get("popularity")
    if popularity_raw is None or popularity_raw == "":
        return -1.0
    try:
        return float(popularity_raw)
    except (TypeError, ValueError):
        return -1.0


def _storytelling_rank(item: dict[str, Any]) -> int:
    fit = str(item.get("storytellingFit") or "weak").strip().lower()
    return 1 if fit == "strong" else 0


def _item_name(item: dict[str, Any]) -> str:
    return str(item.get("name") or "").strip()


def _name_key(name: str) -> str:
    text = unicodedata.normalize("NFKC", str(name or "").strip())
    text = re.sub(r"\s+", " ", text)
    return text.casefold()


def resolve_target_group_count(raw: int | None, *, food_item_count: int) -> int:
    """Clamp configured target to menu size and allowed range (default 4)."""
    count = MENU_CLUSTERER_DEFAULT_GROUP_COUNT if raw is None else int(raw)
    count = max(MENU_CLUSTERER_MIN_GROUP_COUNT, min(MENU_CLUSTERER_MAX_GROUP_COUNT, count))
    if food_item_count > 0:
        count = min(count, food_item_count)
    return max(MENU_CLUSTERER_MIN_GROUP_COUNT, count)


def rank_top_food_leads(
    items: list[dict[str, Any]],
    *,
    limit: int = MENU_CLUSTERER_TOP_LEADS,
) -> list[dict[str, Any]]:
    """Rank food items by popularity desc, strong storytelling tie-break, then name."""
    food = food_items_only(items)
    ranked = sorted(
        food,
        key=lambda item: (
            -_item_popularity(item),
            -_storytelling_rank(item),
            _item_name(item).casefold(),
        ),
    )
    return ranked[:limit]


def _items_by_name(items: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    by_name: dict[str, dict[str, Any]] = {}
    for item in items:
        name = _item_name(item)
        key = _name_key(name)
        if key and key not in by_name:
            by_name[key] = item
    return by_name


def _resolve_food_item(by_name: dict[str, dict[str, Any]], name: str) -> dict[str, Any] | None:
    key = _name_key(name)
    if not key:
        return None
    hit = by_name.get(key)
    if hit is not None:
        return hit
    prefix_matches = [
        item
        for item_key, item in by_name.items()
        if item_key.startswith(key) or key.startswith(item_key)
    ]
    if len(prefix_matches) == 1:
        return prefix_matches[0]
    return None


def _top5_name_keys(top5_leads: list[dict[str, Any]]) -> set[str]:
    return {_name_key(_item_name(item)) for item in top5_leads if _item_name(item)}


def _ensure_top5_lead(
    lead_name: str,
    supporting_names: list[str],
    *,
    top5_leads: list[dict[str, Any]],
    cluster_index: int,
    by_name: dict[str, dict[str, Any]],
    strict: bool,
) -> tuple[str, list[str]]:
    """Keep cluster lead in the top-5 pool; optionally auto-correct LLM drift."""
    top5_keys = _top5_name_keys(top5_leads)
    lead_key = _name_key(lead_name)
    if lead_key in top5_keys:
        return lead_name, supporting_names

    if strict:
        raise ValueError(
            f"cluster {cluster_index + 1} lead {lead_name!r} must be one of the top-{MENU_CLUSTERER_TOP_LEADS} food leads"
        )

    top5_names = [_item_name(item) for item in top5_leads if _item_name(item)]
    if not top5_names:
        raise ValueError("menu_clusterer requires at least one top food lead")

    corrected = top5_names[cluster_index % len(top5_names)]
    corrected_key = _name_key(corrected)
    new_supporting = [name for name in supporting_names if _name_key(name) != corrected_key]
    if (
        lead_key
        and lead_key != corrected_key
        and _resolve_food_item(by_name, lead_name)
        and lead_key not in {_name_key(name) for name in new_supporting}
    ):
        new_supporting.insert(
            0, _item_name(_resolve_food_item(by_name, lead_name) or {"name": lead_name})
        )
    return corrected, new_supporting[: MENU_CLUSTERER_GROUP_MAX_SIZE - 1]


def _overall_strategy(campaign_brief_data: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(campaign_brief_data, dict):
        return {}
    overall = campaign_brief_data.get("overallStrategy")
    return overall if isinstance(overall, dict) else {}


def _strategy_focus(campaign_brief_data: dict[str, Any] | None) -> str:
    overall = _overall_strategy(campaign_brief_data)
    return str(overall.get("strategyFocus") or "").strip() or _DEFAULT_STRATEGY_FOCUS


def _core_message(campaign_brief_data: dict[str, Any] | None) -> str:
    overall = _overall_strategy(campaign_brief_data)
    return str(overall.get("coreMessage") or "").strip() or _DEFAULT_CORE_MESSAGE


def _offer_window(campaign_brief_data: dict[str, Any] | None) -> str:
    overall = _overall_strategy(campaign_brief_data)
    return str(overall.get("offerWindow") or "").strip() or _DEFAULT_OFFER_WINDOW


def _creative_role_for_index(index: int) -> str:
    if index < len(_CREATIVE_ROLE_SEQUENCE):
        return _CREATIVE_ROLE_SEQUENCE[index]
    return _CREATIVE_ROLE_SEQUENCE[-1]


def _build_asset_hint(
    item: dict[str, Any],
    *,
    offer_window: str,
    theme_label: str,
) -> str:
    raw_tags = item.get("tags")
    tags: dict[str, Any] = raw_tags if isinstance(raw_tags, dict) else {}
    name = _item_name(item) or "the hero dish"
    reel_moment = str(tags.get("reel_moment") or "").strip() or "hero moment"
    prep_style = tags.get("prep_style")
    prep_hint = ""
    if isinstance(prep_style, list) and prep_style:
        prep_hint = f" Show the {' / '.join(str(value).strip() for value in prep_style if str(value).strip())} prep."
    theme = theme_label.strip()
    theme_hint = f" Theme: {theme}." if theme else ""
    return (
        f"Keep the lunch CTA consistent for {offer_window}; rotate visuals with a {reel_moment} shot of {name}."
        f"{prep_hint}{theme_hint}"
    ).strip()


def _group_item_from_menu_item(item: dict[str, Any], *, position: int) -> dict[str, Any]:
    raw_tags = item.get("tags")
    tags: dict[str, Any] = raw_tags if isinstance(raw_tags, dict) else {}
    reel_moment = str(tags.get("reel_moment") or "").strip() or "static_hero"
    role = str(item.get("role") or "star").strip()
    storytelling_fit = str(item.get("storytellingFit") or "weak").strip().lower()
    group_item: dict[str, Any] = {
        "name": _item_name(item),
        "role": role if role in ("star", "puzzle") else "star",
        "category": str(item.get("category") or "").strip() or "(uncategorized)",
        "position": position,
        "storytellingFit": "strong" if storytelling_fit == "strong" else "weak",
        "reelMoment": reel_moment,
    }
    popularity_raw = item.get("popularity")
    if popularity_raw is not None and popularity_raw != "":
        with contextlib.suppress(TypeError, ValueError):
            group_item["popularity"] = float(popularity_raw)
    return group_item


def _compute_mix(group_items: list[dict[str, Any]]) -> dict[str, Any]:
    strong = sum(1 for item in group_items if item.get("storytellingFit") == "strong")
    stars = sum(1 for item in group_items if item.get("role") == "star")
    puzzles = sum(1 for item in group_items if item.get("role") == "puzzle")
    return {
        "priceLevels": [],
        "storytellingStrongCount": strong,
        "starCount": stars,
        "puzzleCount": puzzles,
    }


def _finalize_cluster_group(
    *,
    lead_item: dict[str, Any],
    supporting_items: list[dict[str, Any]],
    index: int,
    campaign_brief_data: dict[str, Any] | None,
    theme_label: str,
    cluster_description: str,
) -> dict[str, Any]:
    raw_tags = lead_item.get("tags")
    tags: dict[str, Any] = raw_tags if isinstance(raw_tags, dict) else {}
    reel_moment = str(tags.get("reel_moment") or "").strip() or "static_hero"
    group_items = [_group_item_from_menu_item(lead_item, position=1)]
    for position, item in enumerate(supporting_items, start=2):
        group_items.append(_group_item_from_menu_item(item, position=position))

    focus = _strategy_focus(campaign_brief_data)
    offer_window = _offer_window(campaign_brief_data)
    description = cluster_description.strip()

    return {
        "id": f"group-{index + 1}",
        "leadName": _item_name(lead_item),
        "profileId": MENU_CLUSTERER_PROFILE_ID,
        "anchor": {"dimension": "reel_moment", "value": reel_moment},
        "items": group_items,
        "mix": _compute_mix(group_items),
        "clusterDescription": description,
        "strategyFocus": focus,
        "coreMessage": _core_message(campaign_brief_data),
        "creativeRole": _creative_role_for_index(index),
        "assetHint": _build_asset_hint(
            lead_item,
            offer_window=offer_window,
            theme_label=theme_label,
        ),
    }


def merge_llm_clusters(
    draft_clusters: list[MenuClustererClusterDraftLike],
    *,
    menu_tagger_items: list[dict[str, Any]],
    top5_leads: list[dict[str, Any]],
    campaign_brief_data: dict[str, Any] | None = None,
    source_menu_tagger_title: str = "",
    source_campaign_brief_title: str = "",
    notes: str = "",
    strict_top5_leads: bool = False,
    min_groups: int = MENU_CLUSTERER_DEFAULT_GROUP_COUNT,
    target_group_count: int | None = None,
) -> dict[str, Any]:
    food_items = food_items_only(menu_tagger_items)
    resolved_min = resolve_target_group_count(min_groups, food_item_count=len(food_items))
    if len(draft_clusters) < resolved_min:
        raise ValueError(
            f"menu_clusterer requires at least {resolved_min} food clusters; "
            f"got {len(draft_clusters)}"
        )

    if len(food_items) < resolved_min:
        raise ValueError(
            f"menu_clusterer requires at least {resolved_min} tagged food items; "
            f"got {len(food_items)}"
        )

    by_name = _items_by_name(food_items)
    if not _top5_name_keys(top5_leads):
        raise ValueError("menu_clusterer requires at least one top food lead")

    groups: list[dict[str, Any]] = []
    food_leads: list[dict[str, Any]] = []
    assigned_in_any_group: set[str] = set()

    for index, cluster in enumerate(draft_clusters):
        lead_name = str(cluster.leadItemName or "").strip()
        supporting_names = [
            str(raw_name or "").strip()
            for raw_name in (cluster.supportingItemNames or [])
            if str(raw_name or "").strip()
        ]
        lead_name, supporting_names = _ensure_top5_lead(
            lead_name,
            supporting_names,
            top5_leads=top5_leads,
            cluster_index=index,
            by_name=by_name,
            strict=strict_top5_leads,
        )
        lead_item = _resolve_food_item(by_name, lead_name)
        if lead_item is None:
            raise ValueError(f"cluster {index + 1} lead {lead_name!r} is not a tagged food item")

        description = str(cluster.clusterDescription or "").strip()
        if len(description) < MENU_CLUSTERER_CLUSTER_DESCRIPTION_MIN_LEN:
            raise ValueError(
                f"cluster {index + 1} clusterDescription must be at least "
                f"{MENU_CLUSTERER_CLUSTER_DESCRIPTION_MIN_LEN} characters"
            )

        supporting: list[dict[str, Any]] = []
        lead_key = _name_key(lead_name)
        seen_in_group = {lead_key}
        for raw_name in supporting_names:
            name = str(raw_name or "").strip()
            name_key = _name_key(name)
            if not name or name_key in seen_in_group:
                continue
            item = _resolve_food_item(by_name, name)
            if item is None:
                raise ValueError(
                    f"cluster {index + 1} supporting item {name!r} is not a tagged food item"
                )
            supporting.append(item)
            seen_in_group.add(name_key)
            if len(supporting) >= MENU_CLUSTERER_GROUP_MAX_SIZE - 1:
                break

        group_size = 1 + len(supporting)
        if group_size > MENU_CLUSTERER_GROUP_MAX_SIZE:
            raise ValueError(
                f"cluster {index + 1} exceeds maximum group size of {MENU_CLUSTERER_GROUP_MAX_SIZE}"
            )

        theme_label = str(cluster.themeLabel or "").strip()
        groups.append(
            _finalize_cluster_group(
                lead_item=lead_item,
                supporting_items=supporting,
                index=index,
                campaign_brief_data=campaign_brief_data,
                theme_label=theme_label,
                cluster_description=description,
            )
        )
        food_leads.append(lead_item)
        assigned_in_any_group.update(seen_in_group)

    unassigned_item_names = [
        _item_name(item)
        for item in food_items
        if _item_name(item) and _name_key(_item_name(item)) not in assigned_in_any_group
    ]

    top_food_lead_names = [_item_name(item) for item in top5_leads if _item_name(item)]

    payload: dict[str, Any] = {
        "foodLeads": food_leads,
        "groups": groups,
        "unassignedItemNames": unassigned_item_names,
        "topFoodLeadNames": top_food_lead_names,
    }
    title = source_menu_tagger_title.strip()
    if title:
        payload["sourceMenuTaggerTitle"] = title
    campaign_title = source_campaign_brief_title.strip()
    if campaign_title:
        payload["sourceCampaignBriefTitle"] = campaign_title
    note_text = notes.strip()
    if note_text:
        payload["notes"] = note_text
    payload["targetGroupCount"] = (
        target_group_count if target_group_count is not None else resolved_min
    )
    return payload
