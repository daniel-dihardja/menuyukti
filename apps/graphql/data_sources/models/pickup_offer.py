"""Location-scoped free-text pickup offer (closing leftovers / surprise bag)."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    Float,
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

PICKUP_OFFER_STATUS_OPEN = "open"
PICKUP_OFFER_STATUS_CLOSED = "closed"
KNOWN_PICKUP_OFFER_STATUSES = frozenset(
    {
        PICKUP_OFFER_STATUS_OPEN,
        PICKUP_OFFER_STATUS_CLOSED,
    }
)


class PickupOffer(Base):
    """Owner-created pickup offer for guests to discover and collect."""

    __tablename__ = "pickup_offer"
    __table_args__ = (
        Index("ix_pickup_offer_location_status", "location_id", "status"),
        Index("ix_pickup_offer_location_available_until", "location_id", "available_until"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    location_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("location.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
        server_default="",
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=PICKUP_OFFER_STATUS_OPEN,
        server_default=text(f"'{PICKUP_OFFER_STATUS_OPEN}'"),
    )
    available_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    available_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    price: Mapped[float | None] = mapped_column(Float, nullable=True)
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

    location: Mapped[Location] = relationship(
        "Location",
        back_populates="pickup_offers",
    )
