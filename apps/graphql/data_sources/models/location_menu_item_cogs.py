"""Location-scoped menu COGS catalog ORM model."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.location import Location


class LocationMenuItemCogs(Base):
    """
    Per-menu COGS values for a location (source of truth for seeding analytics runs).
    """

    __tablename__ = "location_menu_item_cogs"
    __table_args__ = (
        UniqueConstraint(
            "location_id",
            "menu",
            name="uq_location_menu_item_cogs_location_menu",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    location_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("location.id", ondelete="CASCADE"),
        index=True,
    )
    menu: Mapped[str] = mapped_column(String(256))
    menu_category: Mapped[str | None] = mapped_column(String(128), nullable=True)
    menu_category_detail: Mapped[str | None] = mapped_column(String(128), nullable=True)
    cogs: Mapped[float] = mapped_column(Float)
    currency: Mapped[str | None] = mapped_column(String(16), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    location: Mapped[Location] = relationship("Location", back_populates="menu_item_cogs")
