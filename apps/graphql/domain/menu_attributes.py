"""Menu dietary-tag and allergen catalogs (no GraphQL / Strawberry imports).

Kept outside ``graphql.schema`` so service-layer code can validate menu
attributes without triggering the schema package circular import.
"""

from __future__ import annotations

DIETARY_TAG_VALUES: frozenset[str] = frozenset(
    {
        "vegan",
        "vegetarian",
        "pescatarian",
        "gluten_free",
        "dairy_free",
        "halal",
        "spicy",
    }
)

ALLERGEN_VALUES: frozenset[str] = frozenset(
    {
        "gluten",
        "dairy",
        "eggs",
        "fish",
        "shellfish",
        "peanuts",
        "tree_nuts",
        "soy",
        "sesame",
    }
)


def normalize_dietary_tags(raw: list[str] | None) -> list[str]:
    """Validate, dedupe, and sort dietary tag keys. Raises ValueError on unknown keys."""
    if not raw:
        return []
    seen: set[str] = set()
    for value in raw:
        key = str(value).strip()
        if not key:
            continue
        if key not in DIETARY_TAG_VALUES:
            raise ValueError(f"Unknown dietary tag: {key}")
        seen.add(key)
    return sorted(seen)


def normalize_allergens(raw: list[str] | None) -> list[str]:
    """Validate, dedupe, and sort allergen keys. Raises ValueError on unknown keys."""
    if not raw:
        return []
    seen: set[str] = set()
    for value in raw:
        key = str(value).strip()
        if not key:
            continue
        if key not in ALLERGEN_VALUES:
            raise ValueError(f"Unknown allergen: {key}")
        seen.add(key)
    return sorted(seen)
