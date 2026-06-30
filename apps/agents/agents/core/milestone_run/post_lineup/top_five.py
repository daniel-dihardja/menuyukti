"""Prepare and build per-category Top 5 Instagram feed carousel posts from menu tagger."""

from __future__ import annotations

import json
import re
from typing import Any, Literal

from agents_app.agents.core.milestone_run.dates_window import TOP_FIVE_CATEGORY_INTERVAL_WEEKS
from agents_app.agents.core.milestone_run.menu_clusterer.cluster import (
    MENU_CLUSTERER_TOP_LEADS,
    distinct_categories_with_stars,
    select_category_star_items,
)
from agents_app.agents.core.milestone_run.post_lineup.build import (
    _build_image_brief_from_item,
    _optional_popularity,
    _optional_storytelling_fit,
)
from pydantic import BaseModel, Field, field_validator

POST_LINEUP_TOP_FIVE_MAX_ITEMS = MENU_CLUSTERER_TOP_LEADS
POST_LINEUP_TOP_FIVE_ID_PREFIX = "top-five"
POST_LINEUP_TOP_FIVE_INTERVAL_WEEKS = TOP_FIVE_CATEGORY_INTERVAL_WEEKS


def _slugify_category(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower())
    return slug.strip("-") or "category"


def _item_display_name(item: dict[str, Any]) -> str:
    return str(item.get("name") or "").strip()


def _name_key(name: str) -> str:
    return name.strip().casefold()


def prepare_top_five_categories(
    menu_tagger_data: dict[str, Any],
    campaign_brief_data: dict[str, Any],
) -> list[dict[str, Any]]:
    items = menu_tagger_data.get("items")
    if not isinstance(items, list):
        return []

    main_category = str(campaign_brief_data.get("mainCategory") or "").strip()
    categories = distinct_categories_with_stars(items, main_category=main_category)
    prepared: list[dict[str, Any]] = []

    for category in categories:
        star_items = select_category_star_items(items, category)
        if not star_items:
            continue
        if len(star_items) > POST_LINEUP_TOP_FIVE_MAX_ITEMS:
            star_items = star_items[:POST_LINEUP_TOP_FIVE_MAX_ITEMS]

        signature_items = [
            {
                "name": name,
                "position": position,
            }
            for position, item in enumerate(star_items, start=1)
            if (name := _item_display_name(item))
        ]
        if not signature_items:
            continue

        prepared.append(
            {
                "category": category,
                "signatureItems": signature_items,
                "starItems": star_items,
            }
        )

    return prepared


def _parse_json_object_string(value: str) -> dict[str, Any] | None:
    text = value.strip()
    if not text.startswith("{"):
        return None
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return None
    return parsed if isinstance(parsed, dict) else None


def _coerce_slide_draft(raw: Any) -> dict[str, str]:
    if isinstance(raw, BaseModel):
        return _coerce_slide_draft(raw.model_dump())
    if isinstance(raw, str):
        parsed = _parse_json_object_string(raw)
        if parsed is not None:
            return _coerce_slide_draft(parsed)
        return {"dishName": raw.strip(), "caption": ""}
    if isinstance(raw, dict):
        dish_name = str(
            raw.get("dishName") or raw.get("name") or raw.get("dish_name") or ""
        ).strip()
        caption = str(raw.get("caption") or raw.get("text") or raw.get("copy") or "").strip()
        parsed_name = _parse_json_object_string(dish_name)
        if parsed_name is not None:
            return _coerce_slide_draft(parsed_name)
        return {"dishName": dish_name, "caption": caption}
    raise ValueError(f"slide must be an object or dish name string, got {type(raw).__name__}")


def _resolve_dish_name_key(dish_name: str, expected_names: set[str]) -> str | None:
    key = dish_name.strip().casefold()
    if key in expected_names:
        return key

    parsed = _parse_json_object_string(dish_name)
    if parsed is not None:
        nested = str(
            parsed.get("dishName") or parsed.get("name") or parsed.get("dish_name") or ""
        ).strip()
        if nested:
            nested_key = nested.casefold()
            if nested_key in expected_names:
                return nested_key

    for expected in expected_names:
        if key == expected or key in expected or expected in key:
            return expected
    return None


def _fill_missing_slide_captions(slides: list[TopFiveSlideDraft]) -> list[TopFiveSlideDraft]:
    filled: list[TopFiveSlideDraft] = []
    for slide in slides:
        caption = slide.caption.strip()
        dish_name = slide.dishName.strip()
        if not caption and dish_name:
            caption = f"A guest favorite: {dish_name}."
        filled.append(TopFiveSlideDraft(dishName=dish_name, caption=caption))
    return filled


class TopFiveSlideDraft(BaseModel):
    dishName: str = Field(description="Exact dish name from signatureItems")
    caption: str = Field(
        description="1–3 sentences of finished carousel-frame copy for this dish"
    )


class TopFivePostDraft(BaseModel):
    category: str
    title: str
    slides: list[TopFiveSlideDraft] = Field(
        description=(
            "One object per signature item with dishName and caption — "
            "not a bare list of dish name strings"
        )
    )

    @field_validator("slides", mode="before")
    @classmethod
    def normalize_slides(cls, value: Any) -> Any:
        if not isinstance(value, list):
            return value
        return [_coerce_slide_draft(item) for item in value]

    @field_validator("slides", mode="after")
    @classmethod
    def ensure_slide_captions(cls, slides: list[TopFiveSlideDraft]) -> list[TopFiveSlideDraft]:
        return _fill_missing_slide_captions(slides)


class PostLineupTopFiveDraft(BaseModel):
    posts: list[TopFivePostDraft]


def validate_top_five_drafts(
    drafts: list[TopFivePostDraft],
    *,
    expected_categories: set[str],
    category_payloads: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    if len(drafts) != len(expected_categories):
        raise ValueError(
            "top five LLM output must include exactly one post per prepared category"
        )

    items_by_category = {
        str(row.get("category") or "").strip().casefold(): row for row in category_payloads
    }
    seen_categories: set[str] = set()
    normalized: list[dict[str, Any]] = []

    for draft in drafts:
        category = draft.category.strip()
        if not category:
            raise ValueError("top five post category must be non-empty")
        if category.casefold() not in {c.casefold() for c in expected_categories}:
            raise ValueError(f"top five post references unknown category: {category}")
        if category.casefold() in seen_categories:
            raise ValueError(f"top five post duplicates category: {category}")
        seen_categories.add(category)

        payload = items_by_category.get(category.casefold())
        if payload is None:
            raise ValueError(f"top five post missing prepared payload for category: {category}")

        signature_items = payload.get("signatureItems")
        if not isinstance(signature_items, list) or not signature_items:
            raise ValueError(f"top five post has no signature items for category: {category}")

        expected_names = {
            str(item.get("name") or "").strip().casefold()
            for item in signature_items
            if isinstance(item, dict) and str(item.get("name") or "").strip()
        }
        display_name_by_key = {
            str(item.get("name") or "").strip().casefold(): str(item.get("name") or "").strip()
            for item in signature_items
            if isinstance(item, dict) and str(item.get("name") or "").strip()
        }
        if len(draft.slides) != len(expected_names):
            raise ValueError(
                f"top five post for {category} must include exactly one slide per signature item"
            )

        slide_names: set[str] = set()
        slide_rows: list[dict[str, str]] = []
        for slide in draft.slides:
            dish_name = slide.dishName.strip()
            caption = slide.caption.strip()
            if not dish_name or not caption:
                raise ValueError("top five slide dishName and caption must be non-empty")
            resolved_key = _resolve_dish_name_key(dish_name, expected_names)
            if resolved_key is None:
                raise ValueError(f"top five slide references unknown dish: {dish_name}")
            dish_name = display_name_by_key.get(resolved_key, dish_name)
            key = resolved_key
            if key in slide_names:
                raise ValueError(f"top five slide duplicates dish: {dish_name}")
            slide_names.add(key)
            slide_rows.append({"dishName": dish_name, "caption": caption})

        if slide_names != expected_names:
            raise ValueError(f"top five post for {category} must cover every signature item")

        title = draft.title.strip()
        if not title:
            raise ValueError("top five post title must be non-empty")

        normalized.append(
            {
                "category": category,
                "title": title,
                "slides": slide_rows,
            }
        )

    if {row["category"].casefold() for row in normalized} != {
        category.casefold() for category in expected_categories
    }:
        raise ValueError("top five LLM output must cover every prepared category exactly once")

    return normalized


def build_top_five_posts_from_draft(
    drafts: list[dict[str, Any]],
    *,
    category_payloads: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    payload_by_category = {
        str(row.get("category") or "").strip().casefold(): row for row in category_payloads
    }
    posts: list[dict[str, Any]] = []

    for draft in drafts:
        category = draft["category"]
        payload = payload_by_category.get(category.casefold())
        if payload is None:
            continue

        star_items = payload.get("starItems")
        if not isinstance(star_items, list):
            star_items = []
        items_by_name = {
            _name_key(_item_display_name(item)): item
            for item in star_items
            if isinstance(item, dict) and _item_display_name(item)
        }

        slides: list[dict[str, Any]] = []
        for slide_draft in draft["slides"]:
            dish_name = slide_draft["dishName"]
            item = items_by_name.get(_name_key(dish_name), {})
            slide: dict[str, Any] = {
                "dishName": dish_name,
                "imageBrief": _build_image_brief_from_item(item if isinstance(item, dict) else {}),
                "caption": slide_draft["caption"],
            }
            role = item.get("role") if isinstance(item, dict) else None
            if role in ("star", "puzzle"):
                slide["role"] = role
            item_category = str(item.get("category") or "").strip() if isinstance(item, dict) else ""
            if item_category:
                slide["category"] = item_category
            fit = _optional_storytelling_fit(item if isinstance(item, dict) else {})
            if fit is not None:
                slide["storytellingFit"] = fit
            popularity = _optional_popularity(item if isinstance(item, dict) else {})
            if popularity is not None:
                slide["popularity"] = popularity
            slides.append(slide)

        if not slides:
            continue

        slug = _slugify_category(category)
        posts.append(
            {
                "id": f"{POST_LINEUP_TOP_FIVE_ID_PREFIX}-{slug}",
                "format": "carousel",
                "intent": "top_five_category",
                "title": draft["title"],
                "category": category,
                "fixdate": False,
                "intervalWeeks": POST_LINEUP_TOP_FIVE_INTERVAL_WEEKS,
                "slides": slides,
            }
        )

    posts.sort(key=lambda post: str(post.get("category") or "").casefold())
    return posts
