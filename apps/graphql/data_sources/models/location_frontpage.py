"""Operator-configured guest frontpage settings for a location."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.location import Location


class LocationFrontpage(Base):
    """One row per location; controls guest-home tagline and analytics sections."""

    __tablename__ = "location_frontpage"
    __table_args__ = (
        UniqueConstraint("location_id", name="uq_location_frontpage_location_id"),
        Index("ix_location_frontpage_location_id", "location_id", unique=False),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    location_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("location.id", ondelete="CASCADE"),
        nullable=False,
    )
    tagline: Mapped[str | None] = mapped_column(String(512), nullable=True)
    show_guest_favorites: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )
    show_popular_combos: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )
    wall_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    favorite_images: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=False,
        default=list,
        server_default=text("'[]'"),
    )
    combo_images: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=False,
        default=list,
        server_default=text("'[]'"),
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
        back_populates="frontpage",
    )
