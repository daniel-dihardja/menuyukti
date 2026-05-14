"""Deterministic pass/fail checks for menu_tagger milestone criteria."""

from __future__ import annotations

import re
from typing import Any, Literal

from agents_app.agents.core.milestone_run.menu_tagger.taxonomy import (
    CONTENT_ANGLE_VALUES,
    COURSE_VALUES,
    DIMENSION_VALUES,
    INGREDIENT_VALUES,
    KIND_VALUES,
    OCCASION_VALUES,
    PREP_STYLE_VALUES,
    REEL_MOMENT_VALUES,
    SERVE_TEMP_VALUES,
    TASTE_VALUES,
    TEXTURE_VALUES,
)

DeterministicVerdict = tuple[Literal["pass", "fail"], str]

_MULTI_VALUE_FIELDS: tuple[tuple[str, frozenset[str], int], ...] = (
    ("ingredient", INGREDIENT_VALUES, 3),
    ("taste", TASTE_VALUES, 3),
    ("course", COURSE_VALUES, 2),
    ("texture", TEXTURE_VALUES, 2),
    ("prep_style", PREP_STYLE_VALUES, 2),
    ("occasion", OCCASION_VALUES, 2),
    ("content_angle", CONTENT_ANGLE_VALUES, 1),
)

_SINGLE_VALUE_FIELDS: tuple[tuple[str, frozenset[str]], ...] = (
    ("kind", KIND_VALUES),
    ("reel_moment", REEL_MOMENT_VALUES),
    ("serve_temp", SERVE_TEMP_VALUES),
)


def _normalize_requirement(requirement: str) -> str:
    return re.sub(r"\*+", "", requirement).strip().lower()


def is_menu_tagger_milestone_data(data: dict[str, Any]) -> bool:
    return data.get("taxonomyVersion") == "v2" and isinstance(data.get("items"), list)


def enrich_menu_tagger_eval_payload(data: dict[str, Any]) -> dict[str, Any]:
    """Attach eval hints so LLM judges do not treat empty optional tag arrays as violations."""
    if not is_menu_tagger_milestone_data(data):
        return data
    enriched = dict(data)
    enriched["_evalHints"] = {
        "taxonomyVersion": "v2",
        "emptyOptionalTagArraysAreValid": True,
        "requiredSingleValueDimensions": ["kind", "reel_moment", "serve_temp"],
        "allowedEnumDimensions": {key: sorted(values) for key, values in DIMENSION_VALUES.items()},
    }
    return enriched


def _validate_item_tags(tags: Any, *, item_label: str) -> list[str]:
    if not isinstance(tags, dict):
        return [f"{item_label}: tags must be an object"]

    issues: list[str] = []
    for field, allowed in _SINGLE_VALUE_FIELDS:
        value = tags.get(field)
        if not isinstance(value, str) or value not in allowed:
            issues.append(f"{item_label}: invalid {field} {value!r}")

    for field, allowed, max_count in _MULTI_VALUE_FIELDS:
        raw = tags.get(field)
        if raw is None:
            continue
        if not isinstance(raw, list):
            issues.append(f"{item_label}: {field} must be an array")
            continue
        if len(raw) > max_count:
            issues.append(f"{item_label}: {field} exceeds max {max_count}")
        seen: set[str] = set()
        for value in raw:
            text = str(value).strip()
            if text not in allowed:
                issues.append(f"{item_label}: invalid {field} value {text!r}")
            elif text in seen:
                issues.append(f"{item_label}: duplicate {field} value {text!r}")
            else:
                seen.add(text)

    return issues


def _items(data: dict[str, Any]) -> list[dict[str, Any]]:
    raw = data.get("items")
    if not isinstance(raw, list):
        return []
    return [row for row in raw if isinstance(row, dict)]


def try_menu_tagger_deterministic_verdict(
    requirement: str,
    data: dict[str, Any],
) -> DeterministicVerdict | None:
    """Return a verdict when data is menu-tagger-shaped and the requirement is checkable without an LLM."""
    if not is_menu_tagger_milestone_data(data):
        return None

    norm = _normalize_requirement(requirement)
    items = _items(data)

    if "v2 taxonomy" in norm or ("taxonomy" in norm and "free-form" in norm):
        issues: list[str] = []
        for item in items:
            name = str(item.get("name") or "item").strip() or "item"
            issues.extend(_validate_item_tags(item.get("tags"), item_label=name))
        if issues:
            detail = "; ".join(issues[:4]) + ("…" if len(issues) > 4 else "")
            return ("fail", detail)
        return (
            "pass",
            "all tag values use fixed v2 taxonomy enums; empty optional tag arrays are allowed.",
        )

    if "promotion_candidates" in norm and ("prior" in norm or "earlier" in norm or "run used" in norm):
        if not items:
            return ("fail", "menu tagger data has no tagged items from promotion candidates.")
        return ("pass", f"menu tagger data tags {len(items)} promotion candidate item(s).")

    if (
        "kind" in norm
        and "reel_moment" in norm
        and "serve_temp" in norm
        and ("required" in norm or "every" in norm or "single-value" in norm)
    ):
        if not items:
            return ("fail", "no menu items to validate.")
        issues = []
        for item in items:
            name = str(item.get("name") or "item").strip() or "item"
            tags = item.get("tags")
            if not isinstance(tags, dict):
                issues.append(f"{name}: missing tags")
                continue
            for field, allowed in _SINGLE_VALUE_FIELDS:
                value = tags.get(field)
                if not isinstance(value, str) or value not in allowed:
                    issues.append(f"{name}: missing or invalid {field}")
            for field, allowed, max_count in _MULTI_VALUE_FIELDS:
                raw = tags.get(field)
                if raw is None:
                    continue
                if not isinstance(raw, list):
                    issues.append(f"{name}: {field} must be an array when present")
                elif len(raw) > max_count:
                    issues.append(f"{name}: {field} exceeds max {max_count}")
                else:
                    for value in raw:
                        if str(value).strip() not in allowed:
                            issues.append(f"{name}: invalid {field} value {value!r}")
        if issues:
            detail = "; ".join(issues[:4]) + ("…" if len(issues) > 4 else "")
            return ("fail", detail)
        return (
            "pass",
            f"all {len(items)} item(s) include required kind, reel_moment, and serve_temp tags.",
        )

    return None
