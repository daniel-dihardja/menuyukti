"""Normalized food preference taxonomy keys (no GraphQL imports).

Used by the Guest Preference Network to validate preference_value keys.
Does not infer allergies, health conditions, or religion from behavior.
Allergen catalogs remain on Digital Menu operational copy only.
"""

from __future__ import annotations

from graphql.domain.manual_quick_profile import CUISINE_TYPES
from graphql.domain.menu_attributes import DIETARY_TAG_VALUES

# Reuse location-brief cuisine keys for preference signals.
CUISINE_PREFERENCE_VALUES: frozenset[str] = CUISINE_TYPES

# Placeholder dish categories for future menu / voting option linking.
DISH_CATEGORY_VALUES: frozenset[str] = frozenset(
    {
        "appetizer",
        "soup",
        "salad",
        "main",
        "side",
        "dessert",
        "beverage",
        "pizza",
        "burger",
        "pasta",
        "rice_bowl",
        "noodle",
        "seafood",
        "grill",
        "street_food",
        "other",
    }
)

# Dietary *interest* (not clinical allergen inference). Aligns with menu tags.
DIETARY_INTEREST_VALUES: frozenset[str] = DIETARY_TAG_VALUES

PREFERENCE_TYPE_CUISINE = "cuisine"
PREFERENCE_TYPE_DISH_CATEGORY = "dish_category"
PREFERENCE_TYPE_DIETARY_INTEREST = "dietary_interest"
PREFERENCE_TYPE_EXPLICIT = "explicit_preference"

KNOWN_PREFERENCE_TYPES: frozenset[str] = frozenset(
    {
        PREFERENCE_TYPE_CUISINE,
        PREFERENCE_TYPE_DISH_CATEGORY,
        PREFERENCE_TYPE_DIETARY_INTEREST,
        PREFERENCE_TYPE_EXPLICIT,
    }
)

_VALUES_BY_TYPE: dict[str, frozenset[str] | None] = {
    PREFERENCE_TYPE_CUISINE: CUISINE_PREFERENCE_VALUES,
    PREFERENCE_TYPE_DISH_CATEGORY: DISH_CATEGORY_VALUES,
    PREFERENCE_TYPE_DIETARY_INTEREST: DIETARY_INTEREST_VALUES,
    # Explicit preferences allow free-form guest-stated keys (normalized).
    PREFERENCE_TYPE_EXPLICIT: None,
}


def normalize_preference_type(raw: str) -> str:
    key = (raw or "").strip()
    if key not in KNOWN_PREFERENCE_TYPES:
        raise ValueError(f"Unknown preference type: {raw}")
    return key


def normalize_preference_value(*, preference_type: str, preference_value: str) -> str:
    """Validate and normalize a preference value for the given type."""
    ptype = normalize_preference_type(preference_type)
    value = (preference_value or "").strip().lower().replace(" ", "_")
    if not value:
        raise ValueError("preference_value is required")
    if len(value) > 128:
        raise ValueError("preference_value too long")
    allowed = _VALUES_BY_TYPE[ptype]
    if allowed is not None and value not in allowed:
        raise ValueError(f"Unknown preference value for {ptype}: {preference_value}")
    return value
