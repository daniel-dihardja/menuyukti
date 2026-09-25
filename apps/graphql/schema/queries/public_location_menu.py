"""Public (unauthenticated) location digital menu query."""

from __future__ import annotations

import strawberry
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from graphql.context import request_session_scope
from graphql.data_sources import Location, Workspace
from graphql.data_sources.models.menu import Menu, MenuCategory
from graphql.schema.types.public_location_menu import (
    PublicLocationMenuType,
    PublicMenuCategoryType,
    PublicMenuItemType,
)


def _public_categories(menu: Menu) -> list[PublicMenuCategoryType]:
    categories = sorted(menu.categories, key=lambda cat: (cat.sort_order, cat.id))
    result: list[PublicMenuCategoryType] = []
    for cat in categories:
        available = sorted(
            (item for item in cat.items if item.is_available),
            key=lambda item: (item.sort_order, item.id),
        )
        if not available:
            continue
        result.append(
            PublicMenuCategoryType(
                name=cat.name,
                sort_order=cat.sort_order,
                items=[
                    PublicMenuItemType(
                        name=item.name,
                        price=float(item.price),
                        sort_order=item.sort_order,
                        description=item.description or "",
                        image_filename=item.image_filename,
                    )
                    for item in available
                ],
            )
        )
    return result


@strawberry.type
class PublicLocationMenuQuery:
    @strawberry.field(
        description=(
            "Public digital menu by location slug. Returns null when the slug "
            "is missing or the menu is not published. No authentication required."
        )
    )
    def public_location_menu(
        self,
        info: strawberry.Info,
        slug: str,
    ) -> PublicLocationMenuType | None:
        cleaned = slug.strip().lower()
        if not cleaned:
            return None

        with request_session_scope(info) as session:
            location = session.scalars(
                select(Location)
                .options(
                    selectinload(Location.frontpage),
                    selectinload(Location.menu)
                    .selectinload(Menu.categories)
                    .selectinload(MenuCategory.items),
                )
                .where(Location.public_slug == cleaned)
            ).one_or_none()
            if location is None:
                return None

            menu = location.menu
            if menu is None or not bool(menu.public_enabled):
                return None

            media_owner: str | None = location.clerk_user_id
            workspace_id: str | None = None
            if location.workspace_id is not None:
                workspace_id = str(location.workspace_id)
                workspace = session.get(Workspace, location.workspace_id)
                if workspace is not None:
                    media_owner = workspace.owner_clerk_user_id

            tagline = location.frontpage.tagline if location.frontpage is not None else None
            return PublicLocationMenuType(
                location_id=location.id,
                name=location.name,
                tagline=tagline,
                public_slug=cleaned,
                currency=location.currency,
                workspace_id=strawberry.ID(workspace_id) if workspace_id else None,
                media_owner_clerk_user_id=media_owner,
                categories=_public_categories(menu),
            )
