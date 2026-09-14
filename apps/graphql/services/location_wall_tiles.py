"""Build curated guest-wall tiles from frontpage config + analytics picks."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

FAVORITES_LIMIT = 5
COMBOS_LIMIT = 3
STRONG_LIFT_THRESHOLD = 1.5


@dataclass(frozen=True)
class WallTile:
    kind: str  # "favorite" | "combo"
    key: str
    title: str
    description: str | None
    image_filename: str | None


def combo_tile_key(menu_a: str, menu_b: str) -> str:
    """Canonical order-insensitive combo key (matches web frontpage form)."""
    a = menu_a.strip()
    b = menu_b.strip()
    return f"{a}::{b}" if a <= b else f"{b}::{a}"


def pick_star_menus(items: list[dict[str, Any]] | None) -> list[str]:
    if not items:
        return []
    stars = [item for item in items if str(item.get("category") or "") == "star"]
    stars.sort(
        key=lambda item: (
            -int(item.get("quantity") or 0),
            str(item.get("menu") or ""),
        )
    )
    out: list[str] = []
    for item in stars[:FAVORITES_LIMIT]:
        menu = str(item.get("menu") or "").strip()
        if menu:
            out.append(menu)
    return out


def pick_strong_combo_pairs(
    pairs: list[dict[str, Any]] | None,
) -> list[tuple[str, str]]:
    if not pairs:
        return []
    strong = [pair for pair in pairs if float(pair.get("lift") or 0) >= STRONG_LIFT_THRESHOLD]
    strong.sort(
        key=lambda pair: (
            -float(pair.get("lift") or 0),
            -int(pair.get("co_order_count") or 0),
            str(pair.get("menu_a") or ""),
            str(pair.get("menu_b") or ""),
        )
    )
    out: list[tuple[str, str]] = []
    for pair in strong[:COMBOS_LIMIT]:
        menu_a = str(pair.get("menu_a") or "").strip()
        menu_b = str(pair.get("menu_b") or "").strip()
        if menu_a and menu_b:
            key = combo_tile_key(menu_a, menu_b)
            a, b = key.split("::", 1)
            out.append((a, b))
    return out


def _favorite_override_map(
    overrides: list[dict[str, Any]] | None,
) -> dict[str, dict[str, Any]]:
    by_menu: dict[str, dict[str, Any]] = {}
    if not overrides:
        return by_menu
    for item in overrides:
        menu = str(item.get("menu") or "").strip()
        if not menu:
            continue
        by_menu[menu] = item
    return by_menu


def _combo_override_map(
    overrides: list[dict[str, Any]] | None,
) -> dict[str, dict[str, Any]]:
    by_key: dict[str, dict[str, Any]] = {}
    if not overrides:
        return by_key
    for item in overrides:
        menu_a = str(item.get("menuA") or item.get("menu_a") or "").strip()
        menu_b = str(item.get("menuB") or item.get("menu_b") or "").strip()
        if not menu_a or not menu_b:
            continue
        by_key[combo_tile_key(menu_a, menu_b)] = item
    return by_key


def _optional_str(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    stripped = value.strip()
    return stripped or None


def _is_published(override: dict[str, Any] | None) -> bool:
    if override is None:
        return True
    published = override.get("published")
    if isinstance(published, bool):
        return published
    return True


def build_wall_tiles(
    *,
    show_guest_favorites: bool,
    show_popular_combos: bool,
    favorite_images: list[dict[str, Any]] | None,
    combo_images: list[dict[str, Any]] | None,
    star_menus: list[str],
    combo_pairs: list[tuple[str, str]],
) -> list[WallTile]:
    """Return published tiles in display order (favorites then combos)."""
    tiles: list[WallTile] = []
    favorite_overrides = _favorite_override_map(favorite_images)
    combo_overrides = _combo_override_map(combo_images)

    if show_guest_favorites:
        for menu in star_menus:
            override = favorite_overrides.get(menu)
            if not _is_published(override):
                continue
            tiles.append(
                WallTile(
                    kind="favorite",
                    key=menu,
                    title=menu,
                    description=_optional_str(override.get("description")) if override else None,
                    image_filename=(
                        _optional_str(
                            override.get("imageFilename")
                            if override and "imageFilename" in override
                            else (override.get("image_filename") if override else None)
                        )
                    ),
                )
            )

    if show_popular_combos:
        for menu_a, menu_b in combo_pairs:
            key = combo_tile_key(menu_a, menu_b)
            override = combo_overrides.get(key)
            if not _is_published(override):
                continue
            tiles.append(
                WallTile(
                    kind="combo",
                    key=key,
                    title=f"{menu_a} + {menu_b}",
                    description=_optional_str(override.get("description")) if override else None,
                    image_filename=(
                        _optional_str(
                            override.get("imageFilename")
                            if override and "imageFilename" in override
                            else (override.get("image_filename") if override else None)
                        )
                    ),
                )
            )

    return tiles


def tile_keys_for_wall(tiles: list[WallTile]) -> set[tuple[str, str]]:
    return {(tile.kind, tile.key) for tile in tiles}
