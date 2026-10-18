"""MIDO Matcha Corner curated menu catalog for POS / guest-menu seed.

Modifier-rich EUR demo shop. Combo offers are fixed-price SKUs (no modifiers).
Modifier groups are defined once as constants and copied onto each item.
Default options are listed first (no ``is_default`` column yet).
"""

from __future__ import annotations

from dataclasses import dataclass

from graphql.services.menu import (
    MenuModifierGroupReplaceInput,
    MenuModifierOptionReplaceInput,
)


@dataclass(frozen=True)
class MidoMenuItem:
    name: str
    category: str
    price: float
    description: str
    dietary_tags: tuple[str, ...] = ()
    allergens: tuple[str, ...] = ()
    modifier_group_keys: tuple[str, ...] = ()


def _opt(name: str, price_delta: float = 0.0) -> MenuModifierOptionReplaceInput:
    return MenuModifierOptionReplaceInput(name=name, price_delta=price_delta)


def _group(
    name: str,
    *,
    min_select: int,
    max_select: int,
    options: tuple[MenuModifierOptionReplaceInput, ...],
) -> MenuModifierGroupReplaceInput:
    return MenuModifierGroupReplaceInput(
        name=name,
        min_select=min_select,
        max_select=max_select,
        options=list(options),
    )


# Shared modifier definitions (copied per item at seed time).
MILK_CHOICE = _group(
    "Milk Choice",
    min_select=1,
    max_select=1,
    options=(
        _opt("Whole milk", 0.0),
        _opt("Oat milk", 0.40),
        _opt("Coconut milk", 0.50),
        _opt("Almond milk", 0.50),
    ),
)

# Mango Matcha: coconut included in base price — listed first as default.
MILK_CHOICE_COCONUT_INCLUDED = _group(
    "Milk Choice",
    min_select=1,
    max_select=1,
    options=(
        _opt("Coconut milk", 0.0),
        _opt("Whole milk", 0.0),
        _opt("Oat milk", 0.40),
        _opt("Almond milk", 0.50),
    ),
)

DRINK_SIZE = _group(
    "Drink Size",
    min_select=1,
    max_select=1,
    options=(
        _opt("Regular (350 ml)", 0.0),
        _opt("Large (450 ml)", 0.80),
    ),
)

TEMPERATURE = _group(
    "Temperature",
    min_select=1,
    max_select=1,
    options=(
        _opt("Hot", 0.0),
        _opt("Iced", 0.0),
    ),
)

SWEETNESS_LEVEL = _group(
    "Sweetness Level",
    min_select=0,
    max_select=1,
    options=(
        _opt("Regular sweetness", 0.0),
        _opt("No added syrup", 0.0),
        _opt("Less sweet", 0.0),
    ),
)

ICE_LEVEL = _group(
    "Ice Level",
    min_select=0,
    max_select=1,
    options=(
        _opt("Regular ice", 0.0),
        _opt("Less ice", 0.0),
        _opt("No ice", 0.0),
    ),
)

EXTRA_TOPPINGS = _group(
    "Extra Toppings",
    min_select=0,
    max_select=6,
    options=(
        _opt("Extra matcha shot", 1.20),
        _opt("Vanilla cold foam", 0.80),
        _opt("Strawberry purée", 0.70),
        _opt("Mango purée", 0.70),
        _opt("Pistachio cream", 1.00),
        _opt("Brown sugar syrup", 0.50),
    ),
)

MIDO_MODIFIER_GROUPS: dict[str, MenuModifierGroupReplaceInput] = {
    "milk": MILK_CHOICE,
    "milk_coconut": MILK_CHOICE_COCONUT_INCLUDED,
    "size": DRINK_SIZE,
    "temperature": TEMPERATURE,
    "sweetness": SWEETNESS_LEVEL,
    "ice": ICE_LEVEL,
    "toppings": EXTRA_TOPPINGS,
}

MIDO_CATEGORY_ORDER: tuple[str, ...] = (
    "Matcha Classics",
    "Signature Matcha",
    "Refreshers & Roasted Tea",
    "Sweet Treats",
    "Combo Offers",
)

MIDO_MENU_CATALOG: tuple[MidoMenuItem, ...] = (
    # --- Matcha Classics ---
    MidoMenuItem(
        name="Pure Matcha",
        category="Matcha Classics",
        price=4.20,
        description="Traditional Japanese matcha whisked with hot water. Serving: Hot (150 ml).",
        dietary_tags=("vegan", "dairy_free", "gluten_free"),
    ),
    MidoMenuItem(
        name="Matcha Latte",
        category="Matcha Classics",
        price=5.20,
        description="Japanese matcha with creamy steamed milk.",
        dietary_tags=("vegetarian",),
        allergens=("dairy",),
        modifier_group_keys=("milk", "size", "temperature", "toppings"),
    ),
    MidoMenuItem(
        name="Iced Matcha Latte",
        category="Matcha Classics",
        price=5.50,
        description="Japanese matcha with chilled milk and ice.",
        dietary_tags=("vegetarian",),
        allergens=("dairy",),
        modifier_group_keys=("milk", "size", "ice", "toppings"),
    ),
    # --- Signature Matcha ---
    MidoMenuItem(
        name="Strawberry Matcha",
        category="Signature Matcha",
        price=6.50,
        description="Iced matcha latte with strawberry purée and milk.",
        dietary_tags=("vegetarian",),
        allergens=("dairy",),
        modifier_group_keys=("milk", "size", "sweetness", "ice", "toppings"),
    ),
    MidoMenuItem(
        name="Mango Matcha",
        category="Signature Matcha",
        price=6.80,
        description="Iced matcha with mango purée and coconut milk.",
        dietary_tags=("vegetarian", "dairy_free"),
        modifier_group_keys=("milk_coconut", "size", "sweetness", "ice", "toppings"),
    ),
    MidoMenuItem(
        name="Blueberry Matcha",
        category="Signature Matcha",
        price=6.80,
        description="Iced matcha latte with blueberry compote and milk.",
        dietary_tags=("vegetarian",),
        allergens=("dairy",),
        modifier_group_keys=("milk", "size", "sweetness", "ice", "toppings"),
    ),
    MidoMenuItem(
        name="Pistachio Matcha",
        category="Signature Matcha",
        price=7.20,
        description="Iced matcha latte with rich pistachio cream.",
        dietary_tags=("vegetarian",),
        allergens=("dairy", "tree_nuts"),
        modifier_group_keys=("milk", "size", "ice", "toppings"),
    ),
    MidoMenuItem(
        name="Vanilla Cloud Matcha",
        category="Signature Matcha",
        price=6.50,
        description="Iced matcha latte topped with vanilla cold foam.",
        dietary_tags=("vegetarian",),
        allergens=("dairy",),
        modifier_group_keys=("milk", "size", "sweetness", "ice", "toppings"),
    ),
    # --- Refreshers & Roasted Tea ---
    MidoMenuItem(
        name="Yuzu Matcha Sparkler",
        category="Refreshers & Roasted Tea",
        price=5.90,
        description=(
            "Refreshing matcha with yuzu syrup, sparkling water and ice. Size: 400 ml."
        ),
        dietary_tags=("vegan", "dairy_free", "gluten_free"),
        modifier_group_keys=("ice",),
    ),
    MidoMenuItem(
        name="Iced Hojicha Latte",
        category="Refreshers & Roasted Tea",
        price=5.50,
        description="Roasted Japanese green tea with chilled milk.",
        dietary_tags=("vegetarian",),
        allergens=("dairy",),
        modifier_group_keys=("milk", "size", "ice", "toppings"),
    ),
    # --- Sweet Treats ---
    MidoMenuItem(
        name="Matcha White Chocolate Cookie",
        category="Sweet Treats",
        price=3.50,
        description="Soft-baked matcha cookie with white chocolate chunks.",
        dietary_tags=("vegetarian",),
        allergens=("gluten", "dairy", "eggs"),
    ),
    MidoMenuItem(
        name="Matcha Tiramisu",
        category="Sweet Treats",
        price=6.20,
        description="Creamy mascarpone, sponge layers and Japanese matcha.",
        dietary_tags=("vegetarian",),
        allergens=("gluten", "dairy", "eggs"),
    ),
    MidoMenuItem(
        name="Strawberry Cream Mochi",
        category="Sweet Treats",
        price=3.80,
        description="Soft Japanese rice cake filled with strawberry cream. Serving: 1 piece.",
        dietary_tags=("vegetarian", "gluten_free"),
        allergens=("dairy",),
    ),
    MidoMenuItem(
        name="Matcha Brownie",
        category="Sweet Treats",
        price=4.20,
        description="Rich and fudgy white-chocolate matcha brownie.",
        dietary_tags=("vegetarian",),
        allergens=("gluten", "dairy", "eggs"),
    ),
    # --- Combo Offers (fixed-price SKUs; no modifiers) ---
    MidoMenuItem(
        name="Matcha Break",
        category="Combo Offers",
        price=8.50,
        description=(
            "1 Iced Matcha Latte (Regular) + 1 Matcha White Chocolate Cookie. "
            "Save €0.50 vs separate (€9.00)."
        ),
        dietary_tags=("vegetarian",),
        allergens=("gluten", "dairy", "eggs"),
    ),
    MidoMenuItem(
        name="Strawberry Treat",
        category="Combo Offers",
        price=9.50,
        description=(
            "1 Strawberry Matcha (Regular) + 1 Strawberry Cream Mochi. "
            "Save €0.80 vs separate (€10.30)."
        ),
        dietary_tags=("vegetarian",),
        allergens=("dairy",),
    ),
    MidoMenuItem(
        name="Matcha Lovers",
        category="Combo Offers",
        price=12.50,
        description=(
            "1 Pistachio Matcha (Regular) + 1 Matcha Tiramisu. "
            "Save €0.90 vs separate (€13.40)."
        ),
        dietary_tags=("vegetarian",),
        allergens=("gluten", "dairy", "eggs", "tree_nuts"),
    ),
)

MIDO_PRODUCT_COUNT = 14
MIDO_COMBO_COUNT = 3
assert len(MIDO_MENU_CATALOG) == MIDO_PRODUCT_COUNT + MIDO_COMBO_COUNT


def modifier_groups_for(item: MidoMenuItem) -> list[MenuModifierGroupReplaceInput]:
    """Resolve catalog keys to replace-input groups (deep-copied option lists)."""
    groups: list[MenuModifierGroupReplaceInput] = []
    for key in item.modifier_group_keys:
        template = MIDO_MODIFIER_GROUPS[key]
        groups.append(
            MenuModifierGroupReplaceInput(
                name=template.name,
                min_select=template.min_select,
                max_select=template.max_select,
                options=[
                    MenuModifierOptionReplaceInput(
                        name=opt.name,
                        price_delta=opt.price_delta,
                        is_available=opt.is_available,
                    )
                    for opt in template.options
                ],
            )
        )
    return groups
