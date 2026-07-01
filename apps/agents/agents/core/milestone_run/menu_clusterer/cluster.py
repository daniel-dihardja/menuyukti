"""Build food menu clusters from menu tagger items and LLM draft."""

from __future__ import annotations

import contextlib
import math
import re
import unicodedata
from typing import Any, Literal, Protocol

MENU_CLUSTERER_PROFILE_ID: Literal["hook_reel"] = "hook_reel"
MENU_CLUSTERER_PROFILE_MENU_HIGHLIGHT: Literal["menu_highlight"] = "menu_highlight"
MENU_CLUSTERER_PROFILE_TOP_FIVE: Literal["top_five"] = "top_five"
MENU_CLUSTERER_HIGHLIGHT_GROUP_ID = "group-menu-highlight"
MENU_CLUSTERER_TOP_LEADS = 5
MENU_CLUSTERER_POPULARITY_SCORE_RANK_LIMIT = 5
MENU_CLUSTERER_HIGHLIGHT_MAX_ITEMS = 12
MENU_CLUSTERER_TOP_FOOD_LEAD_NAMES_MAX = 12
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


def clusterable_menu_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Tagged menu items eligible for hook Reel clustering (any POS category or tag kind)."""
    result: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        name = item.get("name")
        if name is None or str(name).strip() == "":
            name = item.get("dishName")
        if str(name or "").strip():
            result.append(item)
    return result


def food_items_only(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Food-tagged items only — used for optional menu_highlight helpers."""
    return [item for item in items if _is_food_item(item)]


def _is_main_course_food_item(item: dict[str, Any]) -> bool:
    if not _is_food_item(item):
        return False
    tags = item.get("tags")
    if not isinstance(tags, dict):
        return False
    course = tags.get("course")
    if not isinstance(course, list):
        return False
    return any(str(value or "").strip().casefold() == "main" for value in course)


def menu_highlight_eligible_items(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Food mains only — used for the deterministic monthly menu highlight cluster."""
    return [item for item in food_items_only(items) if _is_main_course_food_item(item)]


def _item_popularity(item: dict[str, Any]) -> float:
    popularity_raw = item.get("popularity")
    if popularity_raw is None or popularity_raw == "":
        return -1.0
    try:
        return float(popularity_raw)
    except (TypeError, ValueError):
        return -1.0


def _has_valid_popularity(item: dict[str, Any]) -> bool:
    return _item_popularity(item) >= 0.0


def _popularity_rank_score(item: dict[str, Any]) -> float:
    """Stable score key for distinct popularity tiers (ties share the same key)."""
    return round(_item_popularity(item), 6)


def _food_sort_key(item: dict[str, Any]) -> tuple[float, int, str]:
    pop_sort = -_popularity_rank_score(item) if _has_valid_popularity(item) else float("inf")
    return (
        pop_sort,
        -_storytelling_rank(item),
        _item_name(item).casefold(),
    )


def sort_items_by_popularity(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Sort menu/cluster/slide rows by popularity (desc), then storytelling, then name."""
    return sorted(items, key=_food_sort_key)


def sort_group_items_by_popularity(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Like sort_items_by_popularity but reassigns 1-based position on each cluster item."""
    return [
        {**row, "position": position}
        for position, row in enumerate(sort_items_by_popularity(items), start=1)
    ]


def sort_all_groups_items_by_popularity(groups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for group in groups:
        updated = {**group}
        raw_items = group.get("items")
        if isinstance(raw_items, list):
            items = [row for row in raw_items if isinstance(row, dict)]
            if len(items) > 1:
                updated["items"] = sort_group_items_by_popularity(items)
                updated["mix"] = _compute_mix(updated["items"])
        result.append(updated)
    return result


def _is_hook_reel_group(group: dict[str, Any]) -> bool:
    return (
        str(group.get("profileId") or MENU_CLUSTERER_PROFILE_ID).strip()
        == MENU_CLUSTERER_PROFILE_ID
    )


def _is_menu_highlight_group(group: dict[str, Any]) -> bool:
    return str(group.get("profileId") or "").strip() == MENU_CLUSTERER_PROFILE_MENU_HIGHLIGHT


def _is_top_five_group(group: dict[str, Any]) -> bool:
    return str(group.get("profileId") or "").strip() == MENU_CLUSTERER_PROFILE_TOP_FIVE


def _storytelling_rank(item: dict[str, Any]) -> int:
    fit = str(item.get("storytellingFit") or "weak").strip().lower()
    return 1 if fit == "strong" else 0


def _item_name(item: dict[str, Any]) -> str:
    name = item.get("name")
    if name is None or str(name).strip() == "":
        name = item.get("dishName")
    return str(name or "").strip()


def _name_key(name: str) -> str:
    text = unicodedata.normalize("NFKC", str(name or "").strip())
    text = re.sub(r"\s+", " ", text)
    return text.casefold()


def derive_target_group_count(tagged_item_count: int) -> int:
    """Derive cluster count from tagged menu size (clamped to 4–8)."""
    if tagged_item_count < MENU_CLUSTERER_MIN_GROUP_COUNT:
        return MENU_CLUSTERER_MIN_GROUP_COUNT
    by_coverage = math.ceil(tagged_item_count / MENU_CLUSTERER_GROUP_MAX_SIZE)
    return max(
        MENU_CLUSTERER_MIN_GROUP_COUNT,
        min(MENU_CLUSTERER_MAX_GROUP_COUNT, by_coverage),
    )


def resolve_target_group_count(raw: int | None, *, food_item_count: int) -> int:
    """Legacy: derive when unset; otherwise clamp configured target to menu size."""
    if raw is None:
        return derive_target_group_count(food_item_count)
    count = max(MENU_CLUSTERER_MIN_GROUP_COUNT, min(MENU_CLUSTERER_MAX_GROUP_COUNT, int(raw)))
    if food_item_count > 0:
        count = min(count, food_item_count)
    return max(MENU_CLUSTERER_MIN_GROUP_COUNT, count)


def _assigned_name_keys(groups: list[dict[str, Any]]) -> set[str]:
    keys: set[str] = set()
    for group in groups:
        items = group.get("items")
        if not isinstance(items, list):
            continue
        for row in items:
            if not isinstance(row, dict):
                continue
            key = _name_key(str(row.get("name") or ""))
            if key:
                keys.add(key)
    return keys


def assign_remaining_food_items(
    groups: list[dict[str, Any]],
    food_items: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Place any tagged items not yet in a cluster into groups with capacity."""
    if not groups:
        raise ValueError("menu_clusterer requires at least one hook Reel cluster to assign items")

    by_name = _items_by_name(food_items)
    assigned_keys = _assigned_name_keys(groups)
    unassigned = [
        item
        for item in food_items
        if _name_key(_item_name(item)) and _name_key(_item_name(item)) not in assigned_keys
    ]
    if not unassigned:
        return sort_all_groups_items_by_popularity(groups)

    result = [{**group, "items": list(group.get("items") or [])} for group in groups]
    hook_indices = [index for index, group in enumerate(result) if _is_hook_reel_group(group)]
    if not hook_indices:
        hook_indices = list(range(len(result)))
    for item in unassigned:
        name_key = _name_key(_item_name(item))
        if not name_key or name_key in assigned_keys:
            continue

        indices = sorted(
            hook_indices,
            key=lambda index: len(result[index].get("items") or []),
        )
        placed = False
        for index in indices:
            group = result[index]
            if not _is_hook_reel_group(group):
                continue
            items = group.get("items")
            if not isinstance(items, list):
                items = []
            if len(items) >= MENU_CLUSTERER_GROUP_MAX_SIZE:
                continue
            if any(
                _name_key(str(row.get("name") or "")) == name_key
                for row in items
                if isinstance(row, dict)
            ):
                assigned_keys.add(name_key)
                placed = True
                break
            menu_item = by_name.get(name_key) or item
            items.append(_group_item_from_menu_item(menu_item, position=len(items) + 1))
            group["items"] = items
            group["mix"] = _compute_mix(items)
            assigned_keys.add(name_key)
            placed = True
            break

        if not placed:
            raise ValueError(
                f"menu_clusterer could not assign tagged item {_item_name(item)!r}; "
                "all clusters are at maximum size"
            )

    return sort_all_groups_items_by_popularity(result)


def select_top_popularity_food_by_score_rank(
    items: list[dict[str, Any]],
    *,
    score_limit: int = MENU_CLUSTERER_POPULARITY_SCORE_RANK_LIMIT,
    eligible_items: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    """Items in the top N distinct popularity scores; all items tied at each included score."""
    pool = eligible_items if eligible_items is not None else clusterable_menu_items(items)
    food_with_popularity = [item for item in pool if _has_valid_popularity(item)]
    if not food_with_popularity:
        return []

    unique_scores = sorted(
        {_popularity_rank_score(item) for item in food_with_popularity},
        reverse=True,
    )
    included_scores = set(unique_scores[:score_limit])
    return [
        item
        for item in sorted(food_with_popularity, key=_food_sort_key)
        if _popularity_rank_score(item) in included_scores
    ]


def select_menu_highlight_items(
    items: list[dict[str, Any]],
    *,
    score_limit: int = MENU_CLUSTERER_POPULARITY_SCORE_RANK_LIMIT,
) -> list[dict[str, Any]]:
    """Main-course food items in the top N distinct popularity score tiers (ties included)."""
    eligible = menu_highlight_eligible_items(items)
    return select_top_popularity_food_by_score_rank(
        items,
        score_limit=score_limit,
        eligible_items=eligible,
    )


def rank_top_food_leads(
    items: list[dict[str, Any]],
    *,
    score_limit: int = MENU_CLUSTERER_POPULARITY_SCORE_RANK_LIMIT,
) -> list[dict[str, Any]]:
    """Eligible hook-cluster leads from top popularity score tiers (ties included)."""
    return select_top_popularity_food_by_score_rank(items, score_limit=score_limit)


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


def _venue_name(campaign_brief_data: dict[str, Any] | None) -> str:
    if not isinstance(campaign_brief_data, dict):
        return "the venue"
    snapshot = campaign_brief_data.get("venueSnapshot")
    if not isinstance(snapshot, dict):
        return "the venue"
    name = str(snapshot.get("venueName") or "").strip()
    return name or "the venue"


def _normalize_category(category: str) -> str:
    return str(category or "").strip() or "(uncategorized)"


def _category_slug(category: str) -> str:
    text = unicodedata.normalize("NFKC", _normalize_category(category))
    text = re.sub(r"[^a-z0-9]+", "-", text.casefold())
    return text.strip("-") or "uncategorized"


def _is_star_item(item: dict[str, Any]) -> bool:
    return str(item.get("role") or "").strip().casefold() == "star"


def _item_category(item: dict[str, Any]) -> str:
    return _normalize_category(str(item.get("category") or ""))


def _category_matches_main_focus(category: str, main_category: str) -> bool:
    focus = main_category.strip()
    if not focus:
        return False
    return _normalize_category(category).casefold() == focus.casefold()


def _main_category_from_brief(campaign_brief_data: dict[str, Any] | None) -> str:
    if not isinstance(campaign_brief_data, dict):
        return ""
    return str(campaign_brief_data.get("mainCategory") or "").strip()


def distinct_categories_with_stars(
    items: list[dict[str, Any]],
    *,
    main_category: str = "",
) -> list[str]:
    """Unique POS categories that have at least one star item, main category first."""
    categories: set[str] = set()
    for item in items:
        if _is_star_item(item):
            categories.add(_item_category(item))
    if not categories:
        return []
    return sorted(
        categories,
        key=lambda category: (
            0 if _category_matches_main_focus(category, main_category) else 1,
            category.casefold(),
        ),
    )


def select_category_star_items(
    items: list[dict[str, Any]],
    category: str,
) -> list[dict[str, Any]]:
    """Star items in a category, sorted by popularity then storytelling."""
    normalized = _normalize_category(category)
    stars = [
        item
        for item in items
        if _is_star_item(item) and _item_category(item).casefold() == normalized.casefold()
    ]
    return sort_items_by_popularity(stars)


def _category_top_five_cluster_description(
    *,
    category: str,
    campaign_brief_data: dict[str, Any] | None,
    item_names: list[str],
) -> str:
    venue = _venue_name(campaign_brief_data)
    focus = _strategy_focus(campaign_brief_data)
    dishes = ", ".join(item_names[:5])
    if len(item_names) > 5:
        dishes = f"{dishes}, and others"
    return (
        f"Deterministic Top 5 cluster for {venue} {category} menu: top star dishes by "
        f"popularity ({dishes}). Grouped for the feed carousel Top 5 post; aligns with "
        f"{focus} strategy."
    )


def _category_signature_cluster_description(
    *,
    category: str,
    campaign_brief_data: dict[str, Any] | None,
    item_names: list[str],
) -> str:
    venue = _venue_name(campaign_brief_data)
    focus = _strategy_focus(campaign_brief_data)
    dishes = ", ".join(item_names[:6])
    if len(item_names) > 6:
        dishes = f"{dishes}, and others"
    return (
        f"Deterministic signature cluster for {venue} {category} menu: star dishes by "
        f"popularity ({dishes}). Grouped for the pinned signature carousel; aligns with "
        f"{focus} strategy."
    )


def build_category_top_five_cluster(
    category: str,
    star_items: list[dict[str, Any]],
    *,
    campaign_brief_data: dict[str, Any] | None = None,
    group_id: str | None = None,
) -> dict[str, Any] | None:
    """Build one per-category top_five group from star items (max 5)."""
    if not star_items:
        return None

    ordered = sort_items_by_popularity(star_items)
    if len(ordered) > MENU_CLUSTERER_TOP_LEADS:
        ordered = ordered[:MENU_CLUSTERER_TOP_LEADS]

    lead_item = ordered[0]
    group_items: list[dict[str, Any]] = []
    for position, item in enumerate(ordered, start=1):
        row = _group_item_from_menu_item(item, position=position)
        row["reelMoment"] = "static_hero"
        group_items.append(row)

    item_names = [_item_name(item) for item in ordered if _item_name(item)]
    description = _category_top_five_cluster_description(
        category=category,
        campaign_brief_data=campaign_brief_data,
        item_names=item_names,
    )
    focus = _strategy_focus(campaign_brief_data)
    offer_window = _offer_window(campaign_brief_data)
    resolved_id = group_id or f"group-top-five-{_category_slug(category)}"

    return {
        "id": resolved_id,
        "leadName": _item_name(lead_item),
        "profileId": MENU_CLUSTERER_PROFILE_TOP_FIVE,
        "category": _normalize_category(category),
        "anchor": {"dimension": "reel_moment", "value": "static_hero"},
        "items": group_items,
        "mix": _compute_mix(group_items),
        "clusterDescription": description,
        "strategyFocus": focus,
        "coreMessage": _core_message(campaign_brief_data),
        "creativeRole": "top_five",
        "assetHint": _build_asset_hint(
            lead_item,
            offer_window=offer_window,
            theme_label=f"{category} Top 5",
        ),
    }


def build_category_signature_cluster(
    category: str,
    star_items: list[dict[str, Any]],
    *,
    campaign_brief_data: dict[str, Any] | None = None,
    group_id: str | None = None,
) -> dict[str, Any] | None:
    """Build one per-category signature menu_highlight group from star items."""
    if not star_items:
        return None

    ordered = sort_items_by_popularity(star_items)
    if len(ordered) > MENU_CLUSTERER_HIGHLIGHT_MAX_ITEMS:
        ordered = ordered[:MENU_CLUSTERER_HIGHLIGHT_MAX_ITEMS]

    lead_item = ordered[0]
    group_items: list[dict[str, Any]] = []
    for position, item in enumerate(ordered, start=1):
        row = _group_item_from_menu_item(item, position=position)
        row["reelMoment"] = "static_hero"
        group_items.append(row)

    item_names = [_item_name(item) for item in ordered if _item_name(item)]
    description = _category_signature_cluster_description(
        category=category,
        campaign_brief_data=campaign_brief_data,
        item_names=item_names,
    )
    focus = _strategy_focus(campaign_brief_data)
    offer_window = _offer_window(campaign_brief_data)
    resolved_id = group_id or f"group-signature-{_category_slug(category)}"

    return {
        "id": resolved_id,
        "leadName": _item_name(lead_item),
        "profileId": MENU_CLUSTERER_PROFILE_MENU_HIGHLIGHT,
        "anchor": {"dimension": "reel_moment", "value": "static_hero"},
        "items": group_items,
        "mix": _compute_mix(group_items),
        "clusterDescription": description,
        "strategyFocus": focus,
        "coreMessage": _core_message(campaign_brief_data),
        "creativeRole": "menu_highlight",
        "assetHint": _build_asset_hint(
            lead_item,
            offer_window=offer_window,
            theme_label=f"{category} signature menu",
        ),
    }


def build_per_category_top_five_clusters(
    menu_tagger_items: list[dict[str, Any]],
    *,
    campaign_brief_data: dict[str, Any] | None = None,
    source_menu_tagger_title: str = "",
    source_campaign_brief_title: str = "",
    notes: str = "",
) -> dict[str, Any]:
    """Build one top_five group per category that has star items."""
    main_category = _main_category_from_brief(campaign_brief_data)
    categories = distinct_categories_with_stars(menu_tagger_items, main_category=main_category)
    if not categories:
        raise ValueError(
            "menu_clusterer requires at least one star item in prior menu_tagger data; "
            "re-run promotion_candidates or widen category selection"
        )

    groups: list[dict[str, Any]] = []
    food_leads: list[dict[str, Any]] = []
    for category in categories:
        star_items = select_category_star_items(menu_tagger_items, category)
        group = build_category_top_five_cluster(
            category,
            star_items,
            campaign_brief_data=campaign_brief_data,
        )
        if group is None:
            continue
        groups.append(group)
        food_leads.append(star_items[0])

    if not groups:
        raise ValueError(
            "menu_clusterer could not build top five groups from star items; "
            "re-run promotion_candidates or widen category selection"
        )

    assigned_keys = _assigned_name_keys(groups)
    unassigned_item_names = [
        _item_name(item)
        for item in menu_tagger_items
        if _item_name(item) and _name_key(_item_name(item)) not in assigned_keys
    ]
    top_food_lead_names = [
        group["leadName"] for group in groups if str(group.get("leadName") or "").strip()
    ]

    payload: dict[str, Any] = {
        "foodLeads": food_leads,
        "groups": groups,
        "unassignedItemNames": unassigned_item_names,
        "topFoodLeadNames": top_food_lead_names,
        "targetGroupCount": len(groups),
        "topFiveGroupCount": len(groups),
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
    return payload


def build_menu_highlight_cluster(
    highlight_items: list[dict[str, Any]],
    *,
    campaign_brief_data: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    """Build the deterministic menu-highlight group for the monthly pinned post."""
    if not highlight_items:
        return None

    return build_category_signature_cluster(
        "menu highlight",
        highlight_items,
        campaign_brief_data=campaign_brief_data,
        group_id=MENU_CLUSTERER_HIGHLIGHT_GROUP_ID,
    )


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
    group_items = sort_group_items_by_popularity(group_items)

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
    target_group_count: int | None = None,
    include_menu_highlight: bool = True,
) -> dict[str, Any]:
    clusterable_items = clusterable_menu_items(menu_tagger_items)
    resolved_count = (
        target_group_count
        if target_group_count is not None
        else derive_target_group_count(len(clusterable_items))
    )
    if len(draft_clusters) < resolved_count:
        raise ValueError(
            f"menu_clusterer requires at least {resolved_count} hook Reel clusters; "
            f"got {len(draft_clusters)}"
        )

    if len(clusterable_items) < resolved_count:
        raise ValueError(
            f"menu_clusterer requires at least {resolved_count} tagged menu items; "
            f"got {len(clusterable_items)}"
        )

    by_name = _items_by_name(clusterable_items)
    if not _top5_name_keys(top5_leads):
        raise ValueError("menu_clusterer requires at least one top popularity lead")

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
            raise ValueError(f"cluster {index + 1} lead {lead_name!r} is not a tagged menu item")

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
                    f"cluster {index + 1} supporting item {name!r} is not a tagged menu item"
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

    groups = assign_remaining_food_items(groups, clusterable_items)

    if include_menu_highlight:
        highlight_items = select_menu_highlight_items(menu_tagger_items)
        highlight_group = build_menu_highlight_cluster(
            highlight_items,
            campaign_brief_data=campaign_brief_data,
        )
        if highlight_group is not None:
            groups = [highlight_group, *groups]

    assigned_after_assign = _assigned_name_keys(groups)
    unassigned_item_names = [
        _item_name(item)
        for item in clusterable_items
        if _item_name(item) and _name_key(_item_name(item)) not in assigned_after_assign
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
    payload["targetGroupCount"] = resolved_count
    return payload


def _normalize_top_five_group_order(group: dict[str, Any]) -> dict[str, Any]:
    """Ensure top_five items are popularity-sorted and leadName matches position 1."""
    raw_items = group.get("items")
    if not isinstance(raw_items, list):
        return group
    items = [row for row in raw_items if isinstance(row, dict)]
    if len(items) <= 1:
        return group
    sorted_items = sort_group_items_by_popularity(items)
    updated = {**group, "items": sorted_items, "mix": _compute_mix(sorted_items)}
    lead_name = str(sorted_items[0].get("name") or "").strip()
    if lead_name:
        updated["leadName"] = lead_name
    return updated


def combine_hybrid_clusterer_output(
    *,
    hook_payload: dict[str, Any],
    top_five_payload: dict[str, Any],
    menu_tagger_items: list[dict[str, Any]],
) -> dict[str, Any]:
    """Merge LLM hook_reel clusters with deterministic per-category top_five groups."""
    top_five_groups = [
        _normalize_top_five_group_order(group)
        for group in top_five_payload.get("groups") or []
        if isinstance(group, dict) and _is_top_five_group(group)
    ]
    hook_groups = [
        group
        for group in hook_payload.get("groups") or []
        if isinstance(group, dict)
        and str(group.get("profileId") or "").strip() == MENU_CLUSTERER_PROFILE_ID
    ]
    if not top_five_groups:
        raise ValueError("menu_clusterer hybrid output requires at least one top_five group")
    if not hook_groups:
        raise ValueError("menu_clusterer hybrid output requires at least one hook_reel cluster")

    combined_groups = top_five_groups + hook_groups
    assigned_keys = _assigned_name_keys(combined_groups)
    clusterable_items = clusterable_menu_items(menu_tagger_items)
    unassigned_item_names = [
        _item_name(item)
        for item in clusterable_items
        if _item_name(item) and _name_key(_item_name(item)) not in assigned_keys
    ]

    payload: dict[str, Any] = {
        "foodLeads": list(hook_payload.get("foodLeads") or []),
        "groups": combined_groups,
        "unassignedItemNames": unassigned_item_names,
        "topFoodLeadNames": list(hook_payload.get("topFoodLeadNames") or []),
        "targetGroupCount": hook_payload.get("targetGroupCount"),
        "topFiveGroupCount": len(top_five_groups),
    }
    for key in ("sourceMenuTaggerTitle", "sourceCampaignBriefTitle", "notes"):
        value = hook_payload.get(key) or top_five_payload.get(key)
        if isinstance(value, str) and value.strip():
            payload[key] = value.strip()
    return payload
