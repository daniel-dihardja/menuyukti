"""Build Instagram feed post concepts from reel lineup food leads."""

from __future__ import annotations

from typing import Any

POST_LINEUP_PINNED_POST_ID = "pinned-monthly-menu"
POST_LINEUP_MAX_SLIDES = 5


def _join_tag_values(values: Any, fallback: str) -> str:
    if not isinstance(values, list):
        return fallback
    cleaned = [str(value).strip() for value in values if str(value).strip()]
    return ", ".join(cleaned) if cleaned else fallback


def _build_image_brief(item: dict[str, Any]) -> str:
    name = str(item.get("name") or "").strip()
    tags = item.get("tags") if isinstance(item.get("tags"), dict) else {}
    texture = _join_tag_values(tags.get("texture"), "appetizing")
    prep_style = _join_tag_values(tags.get("prep_style"), "chef-prepared")
    reel_moment = str(tags.get("reel_moment") or "").strip() or "hero"
    serve_temp = str(tags.get("serve_temp") or "").strip() or "fresh"

    return (
        f"High-quality appetizing food photography of {name}. "
        f"{texture} texture, {prep_style} presentation, served {serve_temp}. "
        f"Capture a {reel_moment} moment with hero framing, natural light, "
        f"and shallow depth of field."
    )


def build_post_lineup(
    food_leads: list[dict[str, Any]],
    *,
    source_reel_lineup_title: str = "",
    notes: str = "",
) -> dict[str, Any]:
    if not food_leads:
        raise ValueError("post_lineup requires at least one food lead from prior reel_lineup data")

    slides: list[dict[str, Any]] = []
    for item in food_leads[:POST_LINEUP_MAX_SLIDES]:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()
        if not name:
            continue
        role = str(item.get("role") or "").strip()
        category = str(item.get("category") or "").strip()
        slide: dict[str, Any] = {
            "dishName": name,
            "imageBrief": _build_image_brief(item),
        }
        if role in ("star", "puzzle"):
            slide["role"] = role
        if category:
            slide["category"] = category
        slides.append(slide)

    if not slides:
        raise ValueError("post_lineup requires at least one valid food lead with a dish name")

    payload: dict[str, Any] = {
        "posts": [
            {
                "id": POST_LINEUP_PINNED_POST_ID,
                "format": "carousel",
                "intent": "pinned_monthly_menu",
                "title": "Monthly top menu",
                "slides": slides,
            }
        ],
    }
    source_title = source_reel_lineup_title.strip()
    if source_title:
        payload["sourceReelLineupTitle"] = source_title
    owner_notes = notes.strip()
    if owner_notes:
        payload["notes"] = owner_notes
    return payload
