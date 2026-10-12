"""GraphQL types for menu item feedback."""

from __future__ import annotations

from datetime import datetime
from enum import Enum

import strawberry


@strawberry.enum(description="Guest thumbs sentiment on a menu item.")
class MenuItemFeedbackSentiment(Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"


@strawberry.enum(description="Moderation status for menu item feedback.")
class MenuItemFeedbackStatus(Enum):
    PENDING = "pending"
    PUBLISHED = "published"
    HIDDEN = "hidden"


@strawberry.type(description="One published guest note shown on the public menu item.")
class PublicMenuItemFeedbackType:
    sentiment: MenuItemFeedbackSentiment | None
    body: str
    guest_display_name: str | None
    owner_reply: str | None
    created_at: datetime


@strawberry.type(description="Owner inbox row for menu item feedback.")
class MenuItemFeedbackType:
    id: int
    location_id: int
    menu_item_id: int
    menu_item_name: str
    pos_order_id: int | None
    clerk_user_id: str
    sentiment: MenuItemFeedbackSentiment | None
    body: str
    guest_display_name: str | None
    owner_reply: str | None
    owner_replied_at: datetime | None
    status: MenuItemFeedbackStatus
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime
