"""Controlled catalogs for menu item dietary tags and allergens."""

from __future__ import annotations

from enum import StrEnum

import strawberry

from graphql.domain.menu_attributes import (
    ALLERGEN_VALUES,
    DIETARY_TAG_VALUES,
    normalize_allergens,
    normalize_dietary_tags,
)

__all__ = [
    "ALLERGEN_VALUES",
    "DIETARY_TAG_VALUES",
    "MenuAllergen",
    "MenuDietaryTag",
    "normalize_allergens",
    "normalize_dietary_tags",
]


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


# Keep GraphQL enums aligned with the domain catalogs used by services.
assert DIETARY_TAG_VALUES == frozenset(tag.value for tag in MenuDietaryTag)
assert ALLERGEN_VALUES == frozenset(allergen.value for allergen in MenuAllergen)
