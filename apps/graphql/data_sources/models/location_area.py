"""Location area ORM model (e.g. Main room, Bar) for inventar usage attribution."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.location import Location


class LocationArea(Base):
    """Named area within a location for tagging stock usage."""

    __tablename__ = "location_area"
    __table_args__ = (
        UniqueConstraint(
            "location_id",
            "name",
            name="uq_location_area_location_name",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    location_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("location.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    location: Mapped[Location] = relationship("Location", back_populates="areas")
