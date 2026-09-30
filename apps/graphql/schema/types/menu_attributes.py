"""Controlled catalogs for menu item dietary tags and allergens."""

from __future__ import annotations

from enum import StrEnum

import strawberry


@strawberry.enum(description="Dietary or lifestyle tag on a menu item.")
class MenuDietaryTag(StrEnum):
    vegan = "vegan"
    vegetarian = "vegetarian"
    pescatarian = "pescatarian"
    gluten_free = "gluten_free"
    dairy_free = "dairy_free"
    halal = "halal"
    spicy = "spicy"


@strawberry.enum(description="Allergen present in a menu item.")
class MenuAllergen(StrEnum):
    gluten = "gluten"
    dairy = "dairy"
    eggs = "eggs"
    fish = "fish"
    shellfish = "shellfish"
    peanuts = "peanuts"
    tree_nuts = "tree_nuts"
    soy = "soy"
    sesame = "sesame"


DIETARY_TAG_VALUES: frozenset[str] = frozenset(tag.value for tag in MenuDietaryTag)
ALLERGEN_VALUES: frozenset[str] = frozenset(allergen.value for allergen in MenuAllergen)


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
