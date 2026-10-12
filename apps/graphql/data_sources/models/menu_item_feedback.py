"""Guest feedback on menu items from the public digital menu."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.location import Location
    from graphql.data_sources.models.menu import MenuItem
    from graphql.data_sources.models.pos_order import PosOrder

FEEDBACK_SENTIMENT_POSITIVE = "positive"
FEEDBACK_SENTIMENT_NEGATIVE = "negative"
KNOWN_FEEDBACK_SENTIMENTS = frozenset(
    {
        FEEDBACK_SENTIMENT_POSITIVE,
        FEEDBACK_SENTIMENT_NEGATIVE,
    }
)

FEEDBACK_STATUS_PENDING = "pending"
FEEDBACK_STATUS_PUBLISHED = "published"
FEEDBACK_STATUS_HIDDEN = "hidden"
KNOWN_FEEDBACK_STATUSES = frozenset(
    {
        FEEDBACK_STATUS_PENDING,
        FEEDBACK_STATUS_PUBLISHED,
        FEEDBACK_STATUS_HIDDEN,
    }
)

FEEDBACK_BODY_MAX_LEN = 280


class MenuItemFeedback(Base):
    """Authenticated guest note on a published digital-menu item."""

    __tablename__ = "menu_item_feedback"
    __table_args__ = (
        Index(
            "ix_menu_item_feedback_location_status_created",
            "location_id",
            "status",
            "created_at",
        ),
        Index(
            "ix_menu_item_feedback_menu_item_status",
            "menu_item_id",
            "status",
        ),
        Index(
            "uq_menu_item_feedback_pending_user_item",
            "clerk_user_id",
            "menu_item_id",
            unique=True,
            postgresql_where=text("status = 'pending'"),
            sqlite_where=text("status = 'pending'"),
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    location_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("location.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    menu_item_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("menu_item.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    pos_order_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("pos_order.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    clerk_user_id: Mapped[str] = mapped_column(String(128), nullable=False)
    sentiment: Mapped[str | None] = mapped_column(String(16), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    guest_display_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    owner_reply: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner_replied_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default=FEEDBACK_STATUS_PENDING,
        server_default=text(f"'{FEEDBACK_STATUS_PENDING}'"),
    )
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    location: Mapped[Location] = relationship("Location")
    menu_item: Mapped[MenuItem] = relationship("MenuItem")
    pos_order: Mapped[PosOrder | None] = relationship("PosOrder")
