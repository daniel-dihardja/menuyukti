"""Append-only POS audit trail."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from graphql.data_sources.database import Base


class PosAuditEvent(Base):
    """Immutable event for POS ticket mutations (no updates/deletes in app code)."""

    __tablename__ = "pos_audit_event"
    __table_args__ = (
        Index("ix_pos_audit_event_location_created", "location_id", "created_at"),
        Index("ix_pos_audit_event_order_created", "pos_order_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    location_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("location.id", ondelete="CASCADE"),
        nullable=False,
    )
    pos_order_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("pos_order.id", ondelete="SET NULL"),
        nullable=True,
    )
    actor_clerk_user_id: Mapped[str] = mapped_column(String(128), nullable=False)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=False,
        default=dict,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
