"""Location opening-hour ORM model."""

from __future__ import annotations

from datetime import time
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.location import Location


class LocationOpeningHour(Base):
    """One daily opening-time range for a location."""

    __tablename__ = "location_opening_hour"
    __table_args__ = (
        UniqueConstraint(
            "location_id", "day_of_week", name="uq_location_opening_hour_location_day"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    location_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("location.id", ondelete="CASCADE"),
        index=True,
    )
    day_of_week: Mapped[str] = mapped_column(String(16), nullable=False)
    open_time: Mapped[time] = mapped_column(Time(), nullable=False)
    close_time: Mapped[time] = mapped_column(Time(), nullable=False)

    location: Mapped[Location] = relationship("Location", back_populates="opening_hours")
