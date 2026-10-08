"""Clerk-keyed point ledger entry — per-user credits at a location."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.location import Location


class PointLedgerEntry(Base):
    """
    Ledger row for a guest's point balance at a location.

    Identity is Clerk ``clerk_user_id`` (same as digital-menu order submit).
    ``amount`` is points; positive credits for this slice. Balance is the sum
    of amounts for (clerk_user_id, location_id).

    ``source_ref`` plus the unique constraint makes awards idempotent
    (e.g. ``pos_order:123``, ``menu_open:2026-10-07``).
    """

    __tablename__ = "point_ledger_entry"
    __table_args__ = (
        UniqueConstraint(
            "clerk_user_id",
            "location_id",
            "action_key",
            "source_ref",
            name="uq_point_ledger_entry_user_location_action_source",
        ),
        Index("ix_point_ledger_entry_clerk_user_id", "clerk_user_id", unique=False),
        Index(
            "ix_point_ledger_entry_clerk_user_created",
            "clerk_user_id",
            "created_at",
            unique=False,
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    clerk_user_id: Mapped[str] = mapped_column(String(128), nullable=False)
    location_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("location.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    action_key: Mapped[str] = mapped_column(String(64), nullable=False)
    source_ref: Mapped[str] = mapped_column(String(128), nullable=False)
    label: Mapped[str | None] = mapped_column(String(256), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    location: Mapped[Location] = relationship(
        "Location",
        back_populates="point_ledger_entries",
    )
