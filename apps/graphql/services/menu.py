"""Location-scoped curated menu helpers."""

from __future__ import annotations

from dataclasses import dataclass, field
from math import isfinite

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from graphql.data_sources.models.menu import (
    Menu,
    MenuCategory,
    MenuItem,
    MenuModifierGroup,
    MenuModifierOption,
)
from graphql.data_sources.models.pos_order import PosOrderLine
from graphql.domain.menu_attributes import normalize_allergens, normalize_dietary_tags

NAME_MAX_LEN = 256
DESCRIPTION_MAX_LEN = 4000
TITLE_MAX_LEN = 256
CATEGORY_NAME_MAX_LEN = 256
IMAGE_FILENAME_MAX_LEN = 512
MODIFIER_NAME_MAX_LEN = 128


@dataclass(frozen=True)
class MenuModifierOptionReplaceInput:
    name: str
    price_delta: float = 0.0
    is_available: bool = True


@dataclass(frozen=True)
class MenuModifierGroupReplaceInput:
    name: str
    min_select: int = 0
    max_select: int = 1
    options: list[MenuModifierOptionReplaceInput] = field(default_factory=list)


@dataclass(frozen=True)
class MenuItemReplaceInput:
    name: str
    price: float
    description: str = ""
    is_available: bool = True
    image_filename: str | None = None
    dietary_tags: list[str] = field(default_factory=list)
    allergens: list[str] = field(default_factory=list)
    modifier_groups: list[MenuModifierGroupReplaceInput] = field(default_factory=list)
    id: int | None = None


@dataclass(frozen=True)
class MenuCategoryReplaceInput:
    name: str
    items: list[MenuItemReplaceInput] = field(default_factory=list)
    id: int | None = None


def validate_modifier_option_fields(
    *,
    name: str,
    price_delta: float,
    is_available: bool = True,
) -> MenuModifierOptionReplaceInput:
    name_clean = name.strip()
    if not name_clean:
        raise ValueError("Modifier option name cannot be empty")
    if len(name_clean) > MODIFIER_NAME_MAX_LEN:
        raise ValueError("Modifier option name is too long")
    if not isfinite(price_delta):
        raise ValueError("Modifier option price_delta must be a number")
    return MenuModifierOptionReplaceInput(
        name=name_clean,
        price_delta=float(price_delta),
        is_available=bool(is_available),
    )


def validate_modifier_group_fields(
    *,
    name: str,
    min_select: int,
    max_select: int,
    options: list[MenuModifierOptionReplaceInput],
) -> MenuModifierGroupReplaceInput:
    name_clean = name.strip()
    if not name_clean:
        raise ValueError("Modifier group name cannot be empty")
    if len(name_clean) > MODIFIER_NAME_MAX_LEN:
        raise ValueError("Modifier group name is too long")
    if min_select < 0 or max_select < 1 or min_select > max_select:
        raise ValueError("Modifier group min_select/max_select are invalid")
    if not options:
        raise ValueError("Modifier group must have at least one option")
    if max_select > len(options):
        raise ValueError("Modifier group max_select cannot exceed option count")
    return MenuModifierGroupReplaceInput(
        name=name_clean,
        min_select=int(min_select),
        max_select=int(max_select),
        options=list(options),
    )


def validate_menu_item_fields(
    *,
    name: str,
    price: float,
    description: str | None = None,
    is_available: bool = True,
    image_filename: str | None = None,
    dietary_tags: list[str] | None = None,
    allergens: list[str] | None = None,
    modifier_groups: list[MenuModifierGroupReplaceInput] | None = None,
    id: int | None = None,
) -> MenuItemReplaceInput:
    name_clean = name.strip()
    if not name_clean:
        raise ValueError("Menu item name cannot be empty")
    if len(name_clean) > NAME_MAX_LEN:
        raise ValueError("Menu item name is too long")

    if not isfinite(price) or price < 0:
        raise ValueError("Menu item price must be a non-negative number")

    desc_clean = (description or "").strip()
    if len(desc_clean) > DESCRIPTION_MAX_LEN:
        raise ValueError("Menu item description is too long")

    image_clean: str | None = None
    if image_filename is not None:
        image_clean = image_filename.strip() or None
        if image_clean is not None and len(image_clean) > IMAGE_FILENAME_MAX_LEN:
            raise ValueError("Menu item image filename is too long")

    if id is not None and (not isinstance(id, int) or id < 1):
        raise ValueError("Menu item id is invalid")

    tags = normalize_dietary_tags(dietary_tags)
    allergen_list = normalize_allergens(allergens)
    groups = list(modifier_groups or [])
    return MenuItemReplaceInput(
        name=name_clean,
        price=float(price),
        description=desc_clean,
        is_available=bool(is_available),
        image_filename=image_clean,
        dietary_tags=tags,
        allergens=allergen_list,
        modifier_groups=groups,
        id=id,
    )


def validate_menu_category_fields(
    *,
    name: str,
    items: list[MenuItemReplaceInput],
    id: int | None = None,
) -> MenuCategoryReplaceInput:
    name_clean = name.strip()
    if not name_clean:
        raise ValueError("Menu category name cannot be empty")
    if len(name_clean) > CATEGORY_NAME_MAX_LEN:
        raise ValueError("Menu category name is too long")
    if id is not None and (not isinstance(id, int) or id < 1):
        raise ValueError("Menu category id is invalid")
    return MenuCategoryReplaceInput(name=name_clean, items=list(items), id=id)


def get_menu_for_location(session: Session, location_id: int) -> Menu | None:
    return session.scalar(
        select(Menu)
        .where(Menu.location_id == location_id)
        .options(
            selectinload(Menu.categories)
            .selectinload(MenuCategory.items)
            .selectinload(MenuItem.modifier_groups)
            .selectinload(MenuModifierGroup.options)
        )
    )


def get_or_create_menu(session: Session, location_id: int, *, title: str = "") -> Menu:
    existing = get_menu_for_location(session, location_id)
    if existing is not None:
        return existing

    title_clean = title.strip()
    if len(title_clean) > TITLE_MAX_LEN:
        raise ValueError("Menu title is too long")

    menu = Menu(location_id=location_id, title=title_clean)
    session.add(menu)
    session.flush()
    return menu


def _menu_item_ids_referenced_by_pos(session: Session, menu_id: int) -> set[int]:
    rows = session.scalars(
        select(PosOrderLine.menu_item_id)
        .join(MenuItem, MenuItem.id == PosOrderLine.menu_item_id)
        .where(MenuItem.menu_id == menu_id)
        .distinct()
    ).all()
    return set(rows)


def _replace_item_modifiers(
    session: Session,
    item_row: MenuItem,
    groups: list[MenuModifierGroupReplaceInput],
) -> None:
    item_row.modifier_groups.clear()
    session.flush()
    for group_index, group in enumerate(groups):
        group_row = MenuModifierGroup(
            menu_item_id=item_row.id,
            name=group.name,
            min_select=group.min_select,
            max_select=group.max_select,
            sort_order=group_index,
        )
        item_row.modifier_groups.append(group_row)
        session.flush()
        for opt_index, opt in enumerate(group.options):
            group_row.options.append(
                MenuModifierOption(
                    group_id=group_row.id,
                    name=opt.name,
                    price_delta=opt.price_delta,
                    is_available=opt.is_available,
                    sort_order=opt_index,
                )
            )


def replace_menu_categories(
    session: Session,
    menu: Menu,
    categories: list[MenuCategoryReplaceInput],
) -> Menu:
    """Upsert categories/items on ``menu``, preserving POS-referenced item ids.

    Existing rows are updated in place when ``id`` is provided. Items still
    referenced by ``pos_order_line`` are never deleted (marked unavailable if
    omitted from the payload). Modifiers are always rebuilt for kept items.
    """
    validated: list[MenuCategoryReplaceInput] = []
    seen_names: set[str] = set()
    seen_item_ids: set[int] = set()
    seen_category_ids: set[int] = set()
    for category in categories:
        validated_items: list[MenuItemReplaceInput] = []
        for item in category.items:
            validated_groups = [
                validate_modifier_group_fields(
                    name=group.name,
                    min_select=group.min_select,
                    max_select=group.max_select,
                    options=[
                        validate_modifier_option_fields(
                            name=opt.name,
                            price_delta=opt.price_delta,
                            is_available=opt.is_available,
                        )
                        for opt in group.options
                    ],
                )
                for group in item.modifier_groups
            ]
            validated_item = validate_menu_item_fields(
                name=item.name,
                price=item.price,
                description=item.description,
                is_available=item.is_available,
                image_filename=item.image_filename,
                dietary_tags=item.dietary_tags,
                allergens=item.allergens,
                modifier_groups=validated_groups,
                id=item.id,
            )
            if validated_item.id is not None:
                if validated_item.id in seen_item_ids:
                    raise ValueError("Duplicate menu item id in replace payload")
                seen_item_ids.add(validated_item.id)
            validated_items.append(validated_item)
        validated_category = validate_menu_category_fields(
            name=category.name,
            items=validated_items,
            id=category.id,
        )
        if validated_category.id is not None:
            if validated_category.id in seen_category_ids:
                raise ValueError("Duplicate menu category id in replace payload")
            seen_category_ids.add(validated_category.id)
        key = validated_category.name.casefold()
        if key in seen_names:
            raise ValueError("Menu category names must be unique")
        seen_names.add(key)
        validated.append(validated_category)

    existing_categories = {cat.id: cat for cat in menu.categories}
    # Prefer the selectinloaded category tree over Menu.items (passive_deletes).
    existing_items = {
        item.id: item for cat in menu.categories for item in cat.items
    }
    referenced_item_ids = _menu_item_ids_referenced_by_pos(session, menu.id)

    keep_category_ids: set[int] = set()
    keep_item_ids: set[int] = set()
    # When the client omits ids (e.g. older tests), reuse rows by casefold name.
    unused_categories_by_name: dict[str, MenuCategory] = {
        cat.name.casefold(): cat for cat in menu.categories
    }
    unused_items_by_name: dict[str, list[MenuItem]] = {}
    for item in existing_items.values():
        unused_items_by_name.setdefault(item.name.casefold(), []).append(item)

    for cat_index, category in enumerate(validated):
        cat_row: MenuCategory | None = None
        if category.id is not None:
            cat_row = existing_categories.get(category.id)
            if cat_row is None or cat_row.menu_id != menu.id:
                raise ValueError(f"Unknown menu category id: {category.id}")
            unused_categories_by_name.pop(cat_row.name.casefold(), None)
            cat_row.name = category.name
            cat_row.sort_order = cat_index
        else:
            cat_row = unused_categories_by_name.pop(category.name.casefold(), None)
            if cat_row is not None:
                cat_row.name = category.name
                cat_row.sort_order = cat_index
            else:
                cat_row = MenuCategory(
                    menu_id=menu.id,
                    name=category.name,
                    sort_order=cat_index,
                )
                menu.categories.append(cat_row)
                session.flush()
        keep_category_ids.add(cat_row.id)

        for item_index, item in enumerate(category.items):
            item_row: MenuItem | None = None
            if item.id is not None:
                item_row = existing_items.get(item.id)
                if item_row is None or item_row.menu_id != menu.id:
                    raise ValueError(f"Unknown menu item id: {item.id}")
                bucket = unused_items_by_name.get(item_row.name.casefold())
                if bucket and item_row in bucket:
                    bucket.remove(item_row)
            else:
                bucket = unused_items_by_name.get(item.name.casefold())
                if bucket:
                    item_row = bucket.pop(0)
            if item_row is not None:
                item_row.name = item.name
                item_row.description = item.description
                item_row.price = item.price
                item_row.sort_order = item_index
                item_row.is_available = item.is_available
                item_row.image_filename = item.image_filename
                item_row.dietary_tags = list(item.dietary_tags)
                item_row.allergens = list(item.allergens)
                if item_row.category_id != cat_row.id:
                    item_row.category = cat_row
            else:
                item_row = MenuItem(
                    menu_id=menu.id,
                    category_id=cat_row.id,
                    name=item.name,
                    description=item.description,
                    price=item.price,
                    sort_order=item_index,
                    is_available=item.is_available,
                    image_filename=item.image_filename,
                    dietary_tags=list(item.dietary_tags),
                    allergens=list(item.allergens),
                )
                cat_row.items.append(item_row)
                session.flush()
            keep_item_ids.add(item_row.id)
            _replace_item_modifiers(session, item_row, item.modifier_groups)

    for item_id, item_row in list(existing_items.items()):
        if item_id in keep_item_ids:
            continue
        if item_id in referenced_item_ids:
            item_row.is_available = False
            keep_item_ids.add(item_id)
            target_cat: MenuCategory | None = None
            old_cat = existing_categories.get(item_row.category_id)
            if old_cat is not None:
                for kept_id in keep_category_ids:
                    candidate = existing_categories.get(kept_id)
                    if candidate is None:
                        continue
                    if candidate.name.casefold() == old_cat.name.casefold():
                        target_cat = candidate
                        break
            if target_cat is None:
                for kept_id in keep_category_ids:
                    candidate = existing_categories.get(kept_id)
                    if candidate is not None:
                        target_cat = candidate
                        break
            if target_cat is not None:
                item_row.category = target_cat
            else:
                keep_category_ids.add(item_row.category_id)
            continue
        # Remove via the category collection so delete-orphan actually drops the row.
        parent = existing_categories.get(item_row.category_id)
        if parent is not None and item_row in parent.items:
            parent.items.remove(item_row)
        else:
            session.delete(item_row)

    session.flush()

    for cat_id, cat_row in list(existing_categories.items()):
        if cat_id in keep_category_ids:
            continue
        remaining = [item for item in list(cat_row.items) if item.id in keep_item_ids]
        if remaining:
            cat_row.sort_order = len(validated) + cat_row.sort_order + 1
            keep_category_ids.add(cat_id)
            continue
        if cat_row in menu.categories:
            menu.categories.remove(cat_row)
        else:
            session.delete(cat_row)

    session.flush()
    refreshed = get_menu_for_location(session, menu.location_id)
    return refreshed or menu
