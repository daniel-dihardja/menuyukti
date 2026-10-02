"""Warung Sunda curated menu catalog for inventar / guest-menu seed only.

Kept separate from the Berlin cafe analytics mock generator so inventar pantry
alignment (Beras, Tahu, Kangkung, Pecel, Santan, Gula Aren) stays stable when
default sales fixtures change.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class WarungMenuItem:
    menu: str
    menu_category: str
    menu_category_detail: str
    menu_code: str
    price: float
    cogs: float
    role: str  # star | plow | puzzle | filler | side
    inventar_ingredients: tuple[str, ...]
    dietary_tags: tuple[str, ...] = ()
    allergens: tuple[str, ...] = ()


# Warung Sunda dishes aligned with inventar pantry seeds:
# Beras Cianjur, Tahu Bandung, Kangkung, Bumbu Pecel, Santan Kelapa, Gula Aren.
WARUNG_MENU_CATALOG: tuple[WarungMenuItem, ...] = (
    WarungMenuItem(
        "Nasi Timbel",
        "MAKANAN",
        "NASI",
        "WSL-FD-001",
        12000.0,
        3500.0,
        "star",
        ("Beras Cianjur",),
        dietary_tags=("halal", "dairy_free", "gluten_free"),
    ),
    WarungMenuItem(
        "Tahu Goreng",
        "MAKANAN",
        "LAUK",
        "WSL-FD-002",
        10000.0,
        2800.0,
        "star",
        ("Tahu Bandung",),
        dietary_tags=("vegetarian", "halal", "dairy_free"),
        allergens=("soy",),
    ),
    WarungMenuItem(
        "Tumis Kangkung",
        "MAKANAN",
        "SAYUR",
        "WSL-FD-003",
        12000.0,
        3200.0,
        "star",
        ("Kangkung",),
        dietary_tags=("vegan", "halal", "dairy_free", "gluten_free", "spicy"),
    ),
    WarungMenuItem(
        "Pecel Sayuran",
        "MAKANAN",
        "SAYUR",
        "WSL-FD-004",
        18000.0,
        5500.0,
        "star",
        ("Bumbu Pecel", "Kangkung"),
        dietary_tags=("vegan", "halal", "dairy_free"),
        allergens=("peanuts",),
    ),
    WarungMenuItem(
        "Sayur Lodeh",
        "MAKANAN",
        "SAYUR",
        "WSL-FD-005",
        15000.0,
        4800.0,
        "star",
        ("Santan Kelapa",),
        dietary_tags=("vegan", "halal", "dairy_free", "gluten_free"),
    ),
    WarungMenuItem(
        "Nasi Putih",
        "MAKANAN",
        "NASI",
        "WSL-FD-006",
        8000.0,
        2200.0,
        "plow",
        ("Beras Cianjur",),
        dietary_tags=("vegan", "halal", "dairy_free", "gluten_free"),
    ),
    WarungMenuItem(
        "Tahu Isi",
        "MAKANAN",
        "LAUK",
        "WSL-FD-007",
        9000.0,
        3500.0,
        "plow",
        ("Tahu Bandung",),
        dietary_tags=("vegetarian", "halal", "dairy_free"),
        allergens=("soy", "gluten"),
    ),
    WarungMenuItem(
        "Gulai Tahu Santan",
        "MAKANAN",
        "LAUK",
        "WSL-FD-008",
        22000.0,
        7000.0,
        "puzzle",
        ("Tahu Bandung", "Santan Kelapa"),
        dietary_tags=("vegetarian", "halal", "dairy_free", "spicy"),
        allergens=("soy",),
    ),
    WarungMenuItem(
        "Es Gula Aren",
        "MINUMAN",
        "ES",
        "WSL-BVG-001",
        14000.0,
        3500.0,
        "puzzle",
        ("Gula Aren",),
        dietary_tags=("vegan", "halal", "dairy_free", "gluten_free"),
    ),
    WarungMenuItem(
        "Teh Manis Gula Aren",
        "MINUMAN",
        "TEH",
        "WSL-BVG-002",
        10000.0,
        2500.0,
        "filler",
        ("Gula Aren",),
        dietary_tags=("vegan", "halal", "dairy_free", "gluten_free"),
    ),
    WarungMenuItem(
        "Nasi Pecel",
        "MAKANAN",
        "NASI",
        "WSL-FD-009",
        20000.0,
        6500.0,
        "filler",
        ("Beras Cianjur", "Bumbu Pecel"),
        dietary_tags=("vegan", "halal", "dairy_free"),
        allergens=("peanuts",),
    ),
    WarungMenuItem(
        "Sambal Dadak",
        "MAKANAN",
        "SAMBAL",
        "WSL-FD-010",
        5000.0,
        1200.0,
        "side",
        (),
        dietary_tags=("vegan", "halal", "dairy_free", "gluten_free", "spicy"),
    ),
    WarungMenuItem(
        "Kerupuk Putih",
        "MAKANAN",
        "SIDE",
        "WSL-FD-011",
        4000.0,
        1000.0,
        "side",
        (),
        dietary_tags=("vegetarian", "halal", "dairy_free"),
        allergens=("gluten",),
    ),
    WarungMenuItem(
        "Air Mineral",
        "MINUMAN",
        "AIR",
        "WSL-BVG-003",
        5000.0,
        1500.0,
        "side",
        (),
        dietary_tags=("vegan", "halal", "dairy_free", "gluten_free"),
    ),
)

WARUNG_CATEGORY_LABELS: dict[str, str] = {
    "MAKANAN": "Makanan",
    "MINUMAN": "Minuman",
}
