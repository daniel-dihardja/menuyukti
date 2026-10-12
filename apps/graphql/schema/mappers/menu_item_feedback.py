"""Map menu item feedback service views to GraphQL types."""

from __future__ import annotations

from graphql.schema.types.menu_item_feedback import (
    MenuItemFeedbackSentiment,
    MenuItemFeedbackStatus,
    MenuItemFeedbackType,
    PublicMenuItemFeedbackType,
)
from graphql.services.menu_item_feedback import MenuItemFeedbackView


def feedback_to_gql(view: MenuItemFeedbackView) -> MenuItemFeedbackType:
    return MenuItemFeedbackType(
        id=view.id,
        location_id=view.location_id,
        menu_item_id=view.menu_item_id,
        menu_item_name=view.menu_item_name,
        pos_order_id=view.pos_order_id,
        clerk_user_id=view.clerk_user_id,
        sentiment=(
            MenuItemFeedbackSentiment(view.sentiment) if view.sentiment else None
        ),
        body=view.body,
        guest_display_name=view.guest_display_name,
        owner_reply=view.owner_reply,
        owner_replied_at=view.owner_replied_at,
        status=MenuItemFeedbackStatus(view.status),
        published_at=view.published_at,
        created_at=view.created_at,
        updated_at=view.updated_at,
    )


def public_feedback_to_gql(view: MenuItemFeedbackView) -> PublicMenuItemFeedbackType:
    return PublicMenuItemFeedbackType(
        sentiment=(
            MenuItemFeedbackSentiment(view.sentiment) if view.sentiment else None
        ),
        body=view.body,
        guest_display_name=view.guest_display_name,
        owner_reply=view.owner_reply,
        created_at=view.created_at,
    )
