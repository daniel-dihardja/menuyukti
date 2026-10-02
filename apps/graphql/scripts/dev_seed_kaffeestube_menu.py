"""Kaffeestube Mitte curated menu catalog for guest-menu / POS seed.

Shared with the Berlin cafe analytics mock generator so location menus stay
aligned with ``dev_mock_SalesRecapitulationDetailReport_1mo.xlsx`` and
``dev_mock_menu_cogs.json``.
"""

from __future__ import annotations

from dataclasses import dataclass

Daypart = str  # breakfast | lunch | afternoon | any


@dataclass(frozen=True)
class KaffeestubeMenuItem:
    menu: str
    menu_category: str
    menu_category_detail: str
    menu_code: str
    price: float
    cogs: float
    role: str  # star | plow | puzzle | filler | side
    # Preferred dayparts for heatmap contrast (empty / {"any"} = all dayparts).
    daypart_bias: frozenset[Daypart] = frozenset({"any"})
    dietary_tags: tuple[str, ...] = ()
    allergens: tuple[str, ...] = ()


def _bias(*parts: Daypart) -> frozenset[Daypart]:
    return frozenset(parts)


# Berlin cafe catalog (EUR). Roles tuned so smoke checks yield stars + strong lift.
KAFFEESTUBE_MENU_CATALOG: tuple[KaffeestubeMenuItem, ...] = (
    KaffeestubeMenuItem(
        "Flat White",
        "COFFEE",
        "ESPRESSO",
        "KSM-CF-001",
        3.8,
        0.9,
        "star",
        _bias("breakfast"),
        dietary_tags=("vegetarian",),
        allergens=("dairy",),
    ),
    KaffeestubeMenuItem(
        "Cappuccino",
        "COFFEE",
        "ESPRESSO",
        "KSM-CF-002",
        3.6,
        0.85,
        "star",
        _bias("breakfast"),
        dietary_tags=("vegetarian",),
        allergens=("dairy",),
    ),
    KaffeestubeMenuItem(
        "Avocado Toast",
        "FOOD",
        "TOAST",
        "KSM-FD-001",
        9.5,
        3.2,
        "star",
        _bias("breakfast", "lunch"),
        dietary_tags=("vegetarian",),
        allergens=("gluten",),
    ),
    KaffeestubeMenuItem(
        "Filter Coffee",
        "COFFEE",
        "BREW",
        "KSM-CF-003",
        3.2,
        2.2,  # thin margin → plow_horse when volume is high
        "plow",
        _bias("breakfast"),
        dietary_tags=("vegan", "dairy_free", "gluten_free"),
    ),
    KaffeestubeMenuItem(
        "Espresso",
        "COFFEE",
        "ESPRESSO",
        "KSM-CF-004",
        2.4,
        1.6,
        "plow",
        _bias("breakfast"),
        dietary_tags=("vegan", "dairy_free", "gluten_free"),
    ),
    KaffeestubeMenuItem(
        "Buttercroissant",
        "BAKERY",
        "PASTRY",
        "KSM-BK-001",
        2.8,
        2.0,
        "plow",
        _bias("breakfast"),
        dietary_tags=("vegetarian",),
        allergens=("gluten", "dairy", "eggs"),
    ),
    KaffeestubeMenuItem(
        "Banana Bread",
        "BAKERY",
        "CAKE",
        "KSM-BK-002",
        3.5,
        0.9,
        "side",
        _bias("afternoon"),
        dietary_tags=("vegetarian",),
        allergens=("gluten", "eggs", "dairy"),
    ),
    KaffeestubeMenuItem(
        "Cheesecake",
        "BAKERY",
        "CAKE",
        "KSM-BK-003",
        4.8,
        1.4,
        "side",
        _bias("afternoon"),
        dietary_tags=("vegetarian",),
        allergens=("gluten", "dairy", "eggs"),
    ),
    KaffeestubeMenuItem(
        "Matcha Latte",
        "TEA",
        "LATTE",
        "KSM-TE-001",
        4.5,
        1.1,
        "puzzle",
        _bias("afternoon"),
        dietary_tags=("vegetarian",),
        allergens=("dairy",),
    ),
    KaffeestubeMenuItem(
        "Chai Latte",
        "TEA",
        "LATTE",
        "KSM-TE-002",
        4.2,
        1.0,
        "filler",
        _bias("afternoon"),
        dietary_tags=("vegetarian",),
        allergens=("dairy",),
    ),
    KaffeestubeMenuItem(
        "Granola Bowl",
        "FOOD",
        "BOWL",
        "KSM-FD-002",
        8.5,
        2.8,
        "puzzle",
        _bias("breakfast", "lunch"),
        dietary_tags=("vegetarian",),
        allergens=("gluten", "tree_nuts", "dairy"),
    ),
    KaffeestubeMenuItem(
        "Toastie",
        "FOOD",
        "TOAST",
        "KSM-FD-003",
        7.5,
        2.4,
        "filler",
        _bias("lunch"),
        dietary_tags=("vegetarian",),
        allergens=("gluten", "dairy"),
    ),
    KaffeestubeMenuItem(
        "Fresh OJ",
        "SOFTDRINKS",
        "JUICE",
        "KSM-SD-001",
        4.0,
        1.2,
        "side",
        _bias("breakfast", "lunch"),
        dietary_tags=("vegan", "dairy_free", "gluten_free"),
    ),
    KaffeestubeMenuItem(
        "Still Water",
        "SOFTDRINKS",
        "WATER",
        "KSM-SD-002",
        2.5,
        1.9,
        "plow",
        _bias("any"),
        dietary_tags=("vegan", "dairy_free", "gluten_free"),
    ),
)

KAFFEESTUBE_CATEGORY_LABELS: dict[str, str] = {
    "COFFEE": "Coffee",
    "TEA": "Tea",
    "SOFTDRINKS": "Soft Drinks",
    "BAKERY": "Bakery",
    "FOOD": "Food",
}

# Intentional co-purchase pairs (both must appear on many shared bills).
COMBO_PAIRS: tuple[tuple[str, str], ...] = (
    ("Cappuccino", "Buttercroissant"),
    ("Flat White", "Banana Bread"),
    ("Matcha Latte", "Cheesecake"),
    ("Avocado Toast", "Fresh OJ"),
)

# Reject leftover inventar / Warung dish names if generation regresses.
WARUNG_DISH_NAMES = frozenset(
    {
        "Nasi Timbel",
        "Tahu Goreng",
        "Tumis Kangkung",
        "Pecel Sayuran",
        "Sayur Lodeh",
        "Nasi Putih",
        "Gulai Tahu Santan",
        "Es Gula Aren",
    }
)
