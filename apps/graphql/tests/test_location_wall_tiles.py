"""Unit tests for curated guest-wall tile builder."""

from __future__ import annotations

from graphql.services.location_wall_tiles import (
    build_wall_tiles,
    combo_tile_key,
    pick_star_menus,
    pick_strong_combo_pairs,
)


def test_combo_tile_key_is_order_insensitive():
    assert combo_tile_key("Burger", "Fries") == combo_tile_key("Fries", "Burger")
    assert combo_tile_key("Burger", "Fries") == "Burger::Fries"


def test_pick_star_menus_limits_and_orders_by_quantity():
    menus = pick_star_menus(
        [
            {"menu": "A", "category": "star", "quantity": 1},
            {"menu": "B", "category": "puzzle", "quantity": 99},
            {"menu": "C", "category": "star", "quantity": 10},
            {"menu": "D", "category": "star", "quantity": 5},
        ]
    )
    assert menus == ["C", "D", "A"]


def test_pick_strong_combo_pairs_filters_lift():
    pairs = pick_strong_combo_pairs(
        [
            {"menu_a": "Fries", "menu_b": "Burger", "lift": 2.0, "co_order_count": 3},
            {"menu_a": "Soup", "menu_b": "Salad", "lift": 1.1, "co_order_count": 10},
        ]
    )
    assert pairs == [("Burger", "Fries")]


def test_build_wall_tiles_hides_unpublished_and_respects_section_toggles():
    tiles = build_wall_tiles(
        show_guest_favorites=True,
        show_popular_combos=True,
        favorite_images=[
            {"menu": "Burger", "published": False},
            {"menu": "Fries", "description": "Crispy", "published": True},
        ],
        combo_images=[{"menuA": "Burger", "menuB": "Fries", "published": False}],
        star_menus=["Burger", "Fries"],
        combo_pairs=[("Burger", "Fries")],
    )
    assert len(tiles) == 1
    assert tiles[0].kind == "favorite"
    assert tiles[0].key == "Fries"
    assert tiles[0].description == "Crispy"

    hidden = build_wall_tiles(
        show_guest_favorites=False,
        show_popular_combos=False,
        favorite_images=[],
        combo_images=[],
        star_menus=["Burger"],
        combo_pairs=[("Burger", "Fries")],
    )
    assert hidden == []
