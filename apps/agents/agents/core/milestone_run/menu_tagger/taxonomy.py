"""Fixed v1 tag taxonomy for menu_tagger milestone (mirror web menu-tagger-taxonomy.ts)."""

from __future__ import annotations

from typing import Literal

TAXONOMY_VERSION = "v1"

MenuTaggerKind = Literal["food", "drink", "other"]
MenuTaggerIngredient = Literal[
    "rice",
    "noodle",
    "bread",
    "meat",
    "seafood",
    "poultry",
    "vegetable",
    "dairy",
    "fruit",
    "egg",
    "coffee",
    "tea",
    "alcohol",
    "other",
]
MenuTaggerTaste = Literal["spicy", "sour", "sweet", "savory", "umami", "bitter", "mild"]
MenuTaggerCourse = Literal[
    "appetizer",
    "main",
    "dessert",
    "side",
    "beverage",
    "snack",
    "combo",
]

KIND_VALUES: frozenset[str] = frozenset({"food", "drink", "other"})
INGREDIENT_VALUES: frozenset[str] = frozenset(
    {
        "rice",
        "noodle",
        "bread",
        "meat",
        "seafood",
        "poultry",
        "vegetable",
        "dairy",
        "fruit",
        "egg",
        "coffee",
        "tea",
        "alcohol",
        "other",
    }
)
TASTE_VALUES: frozenset[str] = frozenset(
    {"spicy", "sour", "sweet", "savory", "umami", "bitter", "mild"}
)
COURSE_VALUES: frozenset[str] = frozenset(
    {"appetizer", "main", "dessert", "side", "beverage", "snack", "combo"}
)

DIMENSION_VALUES: dict[str, frozenset[str]] = {
    "kind": KIND_VALUES,
    "ingredient": INGREDIENT_VALUES,
    "taste": TASTE_VALUES,
    "course": COURSE_VALUES,
}

MAX_INGREDIENT_TAGS = 3
MAX_TASTE_TAGS = 3
MAX_COURSE_TAGS = 2
