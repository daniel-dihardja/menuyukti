"""Deterministic reel lineup clustering (mirror web reel-lineup.ts)."""

from __future__ import annotations

from typing import Any, Literal

REEL_LINEUP_PROFILE_ID = "hook_reel"
REEL_LINEUP_GROUP_MIN_SIZE = 3
REEL_LINEUP_GROUP_MAX_SIZE = 5

REEL_HOOK_MOMENTS_HIGH = frozenset(
    {
        "pour",
        "sizzle",
        "stretch_pull",
        "flame",
        "toss_stir",
        "crunch_break",
        "drip_melt",
        "bubble_fizz",
    }
)
REEL_HOOK_MOMENTS_MEDIUM = frozenset(
    {
        "steam",
        "steam_open",
        "layer_build",
        "slice_reveal",
        "garnish_finish",
    }
)
CONTENT_ANGLE_LEAD_BOOST = frozenset(
    {"signature", "bestseller", "chef_pick", "premium_hero"}
)


def _reel_hook_strength(reel_moment: str) -> float:
    if reel_moment in REEL_HOOK_MOMENTS_HIGH:
        return 1.0
    if reel_moment in REEL_HOOK_MOMENTS_MEDIUM:
        return 0.65
    if reel_moment == "static_hero":
        return 0.3
    return 0.5


def _content_angle_lead_boost(content_angles: list[str]) -> float:
    return 1.0 if any(angle in CONTENT_ANGLE_LEAD_BOOST for angle in content_angles) else 0.0


def _promotion_candidate_item_key(name: str, role: str, category: str) -> str:
    return f"{name.casefold()}\0{role}\0{category.casefold()}"


def _parse_promotion_item(raw: Any) -> dict[str, Any]:
    if isinstance(raw, str):
        return {
            "name": raw.strip(),
            "storytellingFit": "strong",
            "storytellingRationale": "",
        }
    if isinstance(raw, dict):
        return raw
    return {}


def index_promotion_candidate_items(data: dict[str, Any]) -> dict[str, dict[str, Any]]:
    index: dict[str, dict[str, Any]] = {}
    categories = data.get("categories")
    if not isinstance(categories, list):
        return index
    for block in categories:
        if not isinstance(block, dict):
            continue
        category = str(block.get("category") or "").strip() or "(uncategorized)"
        for role in ("star", "puzzle"):
            raw_items = block.get("starItems" if role == "star" else "puzzleItems")
            if not isinstance(raw_items, list):
                continue
            for raw in raw_items:
                item = _parse_promotion_item(raw)
                name = str(item.get("name") or "").strip()
                if not name:
                    continue
                index[_promotion_candidate_item_key(name, role, category)] = item
    return index


def _tags(item: dict[str, Any]) -> dict[str, Any]:
    tags = item.get("tags")
    return tags if isinstance(tags, dict) else {}


def _enrich_item(item: dict[str, Any], promotion_index: dict[str, dict[str, Any]]) -> dict[str, Any]:
    category = str(item.get("category") or "").strip() or "(uncategorized)"
    role = str(item.get("role") or "")
    name = str(item.get("name") or "").strip()
    promotion = promotion_index.get(_promotion_candidate_item_key(name, role, category))
    parsed = promotion if isinstance(promotion, dict) else {}
    popularity_raw = parsed.get("popularity")
    popularity = float(popularity_raw) if popularity_raw not in (None, "") else 0.0
    price_level_raw = parsed.get("priceLevel", parsed.get("price_level"))
    price_level: Literal[1, 2, 3] = (
        int(price_level_raw) if price_level_raw in (1, 2, 3) else 2  # type: ignore[assignment]
    )
    storytelling_fit_raw = str(parsed.get("storytellingFit") or "weak").strip().lower()
    storytelling_fit: Literal["strong", "weak"] = (
        "strong" if storytelling_fit_raw == "strong" else "weak"
    )
    tags = _tags(item)
    hook = _reel_hook_strength(str(tags.get("reel_moment") or ""))
    storytelling_strong = 1.0 if storytelling_fit == "strong" else 0.0
    content_angles = tags.get("content_angle")
    angles = content_angles if isinstance(content_angles, list) else []
    angle_boost = _content_angle_lead_boost([str(value) for value in angles])
    normalized_price = (price_level - 1) / 2
    lead_score = 0.0
    if role == "star":
        lead_score = (
            (0.35 * popularity)
            + (0.2 * storytelling_strong)
            + (0.2 * hook)
            + (0.15 * angle_boost)
            + (0.1 * normalized_price)
        )
    return {
        **item,
        "popularity": popularity,
        "priceLevel": price_level,
        "storytellingFit": storytelling_fit,
        "leadScore": lead_score,
    }


def _prep_style_overlap(a: list[str], b: list[str]) -> bool:
    if not a or not b:
        return True
    set_b = set(b)
    return any(value in set_b for value in a)


def _primary_ingredient(item: dict[str, Any]) -> str | None:
    ingredient = _tags(item).get("ingredient")
    if isinstance(ingredient, list) and ingredient:
        return str(ingredient[0])
    return None


def _count_price_level(levels: list[int], level: int) -> int:
    return sum(1 for value in levels if value == level)


def _count_storytelling_weak(items: list[dict[str, Any]]) -> int:
    return sum(1 for item in items if item.get("storytellingFit") == "weak")


def _count_role(items: list[dict[str, Any]], role: str) -> int:
    return sum(1 for item in items if item.get("role") == role)


def _can_add_to_group(group: list[dict[str, Any]], candidate: dict[str, Any]) -> bool:
    if len(group) >= REEL_LINEUP_GROUP_MAX_SIZE:
        return False
    lead = group[0]
    lead_tags = _tags(lead)
    candidate_tags = _tags(candidate)
    if candidate_tags.get("reel_moment") != lead_tags.get("reel_moment"):
        return False
    if candidate_tags.get("serve_temp") != lead_tags.get("serve_temp"):
        return False
    if candidate_tags.get("kind") != lead_tags.get("kind"):
        return False

    hypothetical = [*group, candidate]
    price_levels = [int(item.get("priceLevel") or 2) for item in hypothetical]
    candidate_level = int(candidate.get("priceLevel") or 2)
    if _count_price_level(price_levels, candidate_level) > 2:
        return False
    lead_level = int(lead.get("priceLevel") or 2)
    if abs(candidate_level - lead_level) > 1:
        return False

    primary = _primary_ingredient(candidate)
    if primary:
        same_ingredient = sum(
            1 for item in hypothetical if _primary_ingredient(item) == primary
        )
        if same_ingredient > 2:
            return False

    if _count_storytelling_weak(hypothetical) > 2:
        return False
    if _count_role(hypothetical, "star") > 4:
        return False
    if _count_role(hypothetical, "puzzle") > 3:
        return False

    puzzle_count = _count_role(hypothetical, "puzzle")
    if puzzle_count >= 2:
        has_strong_or_angle = any(
            item.get("storytellingFit") == "strong"
            or "hidden_gem" in (_tags(item).get("content_angle") or [])
            or "chef_pick" in (_tags(item).get("content_angle") or [])
            for item in hypothetical
        )
        if not has_strong_or_angle:
            return False

    if len(hypothetical) >= 4 and len(set(price_levels)) < 2:
        return False

    return True


def _support_score(group: list[dict[str, Any]], candidate: dict[str, Any]) -> float:
    lead = group[0]
    lead_tags = _tags(lead)
    candidate_tags = _tags(candidate)
    score = 0.0
    lead_prep = lead_tags.get("prep_style")
    candidate_prep = candidate_tags.get("prep_style")
    if _prep_style_overlap(
        [str(value) for value in lead_prep] if isinstance(lead_prep, list) else [],
        [str(value) for value in candidate_prep] if isinstance(candidate_prep, list) else [],
    ):
        score += 0.25
    if candidate.get("storytellingFit") == "strong":
        score += 0.2
    if candidate.get("role") == "puzzle":
        score += 0.15
    content_angle = candidate_tags.get("content_angle")
    if isinstance(content_angle, list) and "hidden_gem" in content_angle:
        score += 0.1
    if int(candidate.get("priceLevel") or 2) != int(lead.get("priceLevel") or 2):
        score += 0.1
    score += float(candidate.get("popularity") or 0.0) * 0.2
    return score


def _to_group_item(item: dict[str, Any], position: int) -> dict[str, Any]:
    return {
        "name": str(item.get("name") or ""),
        "role": item.get("role"),
        "category": str(item.get("category") or ""),
        "position": position,
        "popularity": float(item.get("popularity") or 0.0),
        "priceLevel": int(item.get("priceLevel") or 2),
        "storytellingFit": item.get("storytellingFit"),
        "reelMoment": str(_tags(item).get("reel_moment") or ""),
    }


def _build_group_mix(items: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "priceLevels": [int(item.get("priceLevel") or 2) for item in items],
        "storytellingStrongCount": sum(
            1 for item in items if item.get("storytellingFit") == "strong"
        ),
        "starCount": _count_role(items, "star"),
        "puzzleCount": _count_role(items, "puzzle"),
    }


def _finalize_group(group: list[dict[str, Any]], index: int) -> dict[str, Any]:
    lead = group[0]
    lead_tags = _tags(lead)
    return {
        "id": f"group-{index + 1}",
        "leadName": str(lead.get("name") or ""),
        "profileId": REEL_LINEUP_PROFILE_ID,
        "anchor": {
            "dimension": "reel_moment",
            "value": str(lead_tags.get("reel_moment") or ""),
        },
        "items": [_to_group_item(item, position + 1) for position, item in enumerate(group)],
        "mix": _build_group_mix(group),
    }


def build_reel_lineup(
    *,
    menu_tagger_items: list[dict[str, Any]],
    promotion_candidates: dict[str, Any],
    source_menu_tagger_title: str = "",
    notes: str = "",
) -> dict[str, Any]:
    promotion_index = index_promotion_candidate_items(promotion_candidates)
    enriched = [_enrich_item(item, promotion_index) for item in menu_tagger_items]

    assigned: set[str] = set()
    groups: list[dict[str, Any]] = []

    stars = sorted(
        (item for item in enriched if item.get("role") == "star"),
        key=lambda item: (
            -float(item.get("leadScore") or 0.0),
            str(item.get("name") or "").casefold(),
        ),
    )

    group_index = 0
    for lead in stars:
        category = str(lead.get("category") or "").strip() or "(uncategorized)"
        lead_key = _promotion_candidate_item_key(
            str(lead.get("name") or ""),
            "star",
            category,
        )
        if lead_key in assigned:
            continue

        group = [lead]
        assigned.add(lead_key)

        while len(group) < REEL_LINEUP_GROUP_MAX_SIZE:
            candidates = [
                item
                for item in enriched
                if (
                    (key := _promotion_candidate_item_key(
                        str(item.get("name") or ""),
                        str(item.get("role") or ""),
                        str(item.get("category") or "").strip() or "(uncategorized)",
                    ))
                    not in assigned
                    and _can_add_to_group(group, item)
                )
            ]
            candidates.sort(key=lambda item: _support_score(group, item), reverse=True)
            if not candidates:
                break
            next_item = candidates[0]
            next_key = _promotion_candidate_item_key(
                str(next_item.get("name") or ""),
                str(next_item.get("role") or ""),
                str(next_item.get("category") or "").strip() or "(uncategorized)",
            )
            group.append(next_item)
            assigned.add(next_key)

        if len(group) >= REEL_LINEUP_GROUP_MIN_SIZE:
            groups.append(_finalize_group(group, group_index))
            group_index += 1
        else:
            for item in group:
                assigned.discard(
                    _promotion_candidate_item_key(
                        str(item.get("name") or ""),
                        str(item.get("role") or ""),
                        str(item.get("category") or "").strip() or "(uncategorized)",
                    )
                )

    unassigned_item_names = [
        str(item.get("name") or "")
        for item in enriched
        if _promotion_candidate_item_key(
            str(item.get("name") or ""),
            str(item.get("role") or ""),
            str(item.get("category") or "").strip() or "(uncategorized)",
        )
        not in assigned
    ]

    payload: dict[str, Any] = {
        "groups": groups,
        "unassignedItemNames": unassigned_item_names,
    }
    if source_menu_tagger_title.strip():
        payload["sourceMenuTaggerTitle"] = source_menu_tagger_title.strip()
    if notes.strip():
        payload["notes"] = notes.strip()
    return payload
