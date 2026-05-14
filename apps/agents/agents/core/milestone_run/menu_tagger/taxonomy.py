"""Fixed v2 tag taxonomy for menu_tagger milestone (mirror web menu-tagger-taxonomy.ts)."""

from __future__ import annotations

from typing import Literal

TAXONOMY_VERSION = "v2"

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
    "pasta",
    "tofu_plant",
    "chocolate",
    "nuts",
    "herbs_aromatics",
    "other",
]
MenuTaggerTaste = Literal[
    "spicy",
    "sour",
    "sweet",
    "savory",
    "umami",
    "bitter",
    "mild",
    "smoky",
    "tangy",
    "fresh",
]
MenuTaggerCourse = Literal[
    "appetizer",
    "main",
    "dessert",
    "side",
    "beverage",
    "snack",
    "combo",
    "breakfast",
    "brunch",
]
MenuTaggerReelMoment = Literal[
    "steam",
    "sizzle",
    "pour",
    "stretch_pull",
    "crunch_break",
    "flame",
    "toss_stir",
    "layer_build",
    "slice_reveal",
    "drip_melt",
    "bubble_fizz",
    "steam_open",
    "garnish_finish",
    "static_hero",
]
MenuTaggerTexture = Literal[
    "crispy",
    "creamy",
    "chewy",
    "juicy",
    "flaky",
    "crunchy",
    "silky",
    "chunky",
]
MenuTaggerPrepStyle = Literal[
    "grilled",
    "fried",
    "baked",
    "raw",
    "smoked",
    "steamed",
    "braised",
    "fermented",
    "assembled",
    "blended",
]
MenuTaggerOccasion = Literal[
    "brunch",
    "lunch",
    "dinner",
    "late_night",
    "date_night",
    "sharing",
    "solo",
    "takeaway",
    "celebration",
    "comfort",
]
MenuTaggerServeTemp = Literal["hot", "cold", "room_temp", "frozen"]
MenuTaggerContentAngle = Literal[
    "signature",
    "bestseller",
    "chef_pick",
    "hidden_gem",
    "new",
    "seasonal",
    "value_hero",
    "premium_hero",
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
        "pasta",
        "tofu_plant",
        "chocolate",
        "nuts",
        "herbs_aromatics",
        "other",
    }
)
TASTE_VALUES: frozenset[str] = frozenset(
    {
        "spicy",
        "sour",
        "sweet",
        "savory",
        "umami",
        "bitter",
        "mild",
        "smoky",
        "tangy",
        "fresh",
    }
)
COURSE_VALUES: frozenset[str] = frozenset(
    {
        "appetizer",
        "main",
        "dessert",
        "side",
        "beverage",
        "snack",
        "combo",
        "breakfast",
        "brunch",
    }
)
REEL_MOMENT_VALUES: frozenset[str] = frozenset(
    {
        "steam",
        "sizzle",
        "pour",
        "stretch_pull",
        "crunch_break",
        "flame",
        "toss_stir",
        "layer_build",
        "slice_reveal",
        "drip_melt",
        "bubble_fizz",
        "steam_open",
        "garnish_finish",
        "static_hero",
    }
)
TEXTURE_VALUES: frozenset[str] = frozenset(
    {
        "crispy",
        "creamy",
        "chewy",
        "juicy",
        "flaky",
        "crunchy",
        "silky",
        "chunky",
    }
)
PREP_STYLE_VALUES: frozenset[str] = frozenset(
    {
        "grilled",
        "fried",
        "baked",
        "raw",
        "smoked",
        "steamed",
        "braised",
        "fermented",
        "assembled",
        "blended",
    }
)
OCCASION_VALUES: frozenset[str] = frozenset(
    {
        "brunch",
        "lunch",
        "dinner",
        "late_night",
        "date_night",
        "sharing",
        "solo",
        "takeaway",
        "celebration",
        "comfort",
    }
)
SERVE_TEMP_VALUES: frozenset[str] = frozenset({"hot", "cold", "room_temp", "frozen"})
CONTENT_ANGLE_VALUES: frozenset[str] = frozenset(
    {
        "signature",
        "bestseller",
        "chef_pick",
        "hidden_gem",
        "new",
        "seasonal",
        "value_hero",
        "premium_hero",
    }
)

DIMENSION_VALUES: dict[str, frozenset[str]] = {
    "kind": KIND_VALUES,
    "ingredient": INGREDIENT_VALUES,
    "taste": TASTE_VALUES,
    "course": COURSE_VALUES,
    "reel_moment": REEL_MOMENT_VALUES,
    "texture": TEXTURE_VALUES,
    "prep_style": PREP_STYLE_VALUES,
    "occasion": OCCASION_VALUES,
    "serve_temp": SERVE_TEMP_VALUES,
    "content_angle": CONTENT_ANGLE_VALUES,
}

SINGLE_VALUE_DIMENSIONS: frozenset[str] = frozenset({"kind", "reel_moment", "serve_temp"})

DEFAULT_REEL_MOMENT = "static_hero"
DEFAULT_SERVE_TEMP = "room_temp"
DEFAULT_KIND = "other"

MAX_INGREDIENT_TAGS = 3
MAX_TASTE_TAGS = 3
MAX_COURSE_TAGS = 2
MAX_TEXTURE_TAGS = 2
MAX_PREP_STYLE_TAGS = 2
MAX_OCCASION_TAGS = 2
MAX_CONTENT_ANGLE_TAGS = 1
