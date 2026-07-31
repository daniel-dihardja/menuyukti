"""Owner-provided structured brief hints (click-first UI); not AI-generated."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.location import Location


class LocationManualBriefInput(Base):
    """One row per location; quick_profile JSON is validated in GraphQL service layer."""

    __tablename__ = "location_manual_brief_input"
    __table_args__ = (
        UniqueConstraint("location_id", name="uq_location_manual_brief_input_location_id"),
        Index("ix_location_manual_brief_input_location_id", "location_id", unique=False),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    location_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("location.id", ondelete="CASCADE"),
        nullable=False,
    )
    quick_profile: Mapped[dict | list | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=True,
    )
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
        back_populates="manual_brief_input",
    )
