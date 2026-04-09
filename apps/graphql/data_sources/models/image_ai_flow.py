"""Image AI flow ORM model."""

from __future__ import annotations

from sqlalchemy import JSON, Boolean, DateTime, Integer, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import true as sql_true

from graphql.data_sources.database import Base


class ImageAiFlow(Base):
    """
    Configurable image post-processing flows (e.g. Leonardo / Nano Banana) for asset uploads.

    Slug is the stable key sent from the web client; display_name is shown in the UI.
    """

    __tablename__ = "image_ai_flow"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(Text, unique=True, index=True)
    display_name: Mapped[str] = mapped_column(Text)
    prompt: Mapped[str] = mapped_column(Text)
    model: Mapped[str] = mapped_column(Text)
    prompt_enhance: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_reference_strength: Mapped[str | None] = mapped_column(Text, nullable=True)
    style_ids: Mapped[list | dict | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=sql_true(),
    )
    sort_order: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default=text("0"),
    )
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
