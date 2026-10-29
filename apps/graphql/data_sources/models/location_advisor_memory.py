"""Advisor-written rolling memory for a location (separate from owner quickProfile)."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.location import Location


class LocationAdvisorMemory(Base):
    """One row per location; content is plain text validated in the GraphQL service layer."""

    __tablename__ = "location_advisor_memory"
    __table_args__ = (
        UniqueConstraint("location_id", name="uq_location_advisor_memory_location_id"),
        Index("ix_location_advisor_memory_location_id", "location_id", unique=False),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    location_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("location.id", ondelete="CASCADE"),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    location: Mapped[Location] = relationship(
        "Location",
        back_populates="advisor_memory",
    )
