"""Append-only AI usage ledger (Leonardo generations and future providers)."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Index, Integer, String, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from graphql.data_sources.database import Base


class AiUsageEvent(Base):
    """
    One row per metered AI action (e.g. Leonardo image generation).

    LLM token spend is attributed via Vercel AI Gateway Custom Reporting;
    this table covers providers that do not go through the gateway.
    """

    __tablename__ = "ai_usage_event"
    __table_args__ = (
        Index("ix_ai_usage_event_user_id", "user_id", unique=False),
        Index("ix_ai_usage_event_created_at", "created_at", unique=False),
        Index("ix_ai_usage_event_user_created", "user_id", "created_at", unique=False),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[str] = mapped_column(String(128), nullable=False)
    provider: Mapped[str] = mapped_column(String(64), nullable=False)
    feature: Mapped[str] = mapped_column(String(64), nullable=False)
    model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    external_id: Mapped[str | None] = mapped_column(String(256), nullable=True)
    units: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    event_metadata: Mapped[dict[str, Any] | None] = mapped_column(
        "metadata",
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
