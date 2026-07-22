"""Workflow-scoped Instagram content item (story, post, or reel draft)."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    desc,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.location import Location
    from graphql.data_sources.models.node import Node


class InstagramItem(Base):
    """Editable Instagram deliverable (story / post / reel) belonging to a workflow."""

    __tablename__ = "instagram_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workflow_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("node.id"),
        nullable=False,
        index=True,
    )
    location_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("location.id"),
        nullable=False,
        index=True,
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str | None] = mapped_column(String(256), nullable=True)
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    hook: Mapped[str | None] = mapped_column(Text, nullable=True)
    visual_brief: Mapped[str | None] = mapped_column(Text, nullable=True)
    media_s3_key: Mapped[str | None] = mapped_column(String(512), nullable=True)
    generation_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    reference_images: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=False,
        default=list,
        server_default=text("'[]'"),
    )
    style_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("visual_style.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="draft",
        server_default=text("'draft'"),
    )
    schedule: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_by_clerk_user_id: Mapped[str | None] = mapped_column(
        String(128), nullable=True, index=True
    )
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    workflow: Mapped[Node] = relationship(foreign_keys=[workflow_id])
    location: Mapped[Location] = relationship(foreign_keys=[location_id])
    media_versions: Mapped[list[InstagramItemMediaVersion]] = relationship(
        back_populates="instagram_item",
        cascade="all, delete-orphan",
        order_by=lambda: desc(InstagramItemMediaVersion.created_at),
    )


class InstagramItemMediaVersion(Base):
    """A single generated image version for an Instagram item.

    Each generation appends a row; the item's media_s3_key points at the committed version.
    """

    __tablename__ = "instagram_item_media_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    instagram_item_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("instagram_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    instagram_item: Mapped[InstagramItem] = relationship(back_populates="media_versions")
    media_s3_key: Mapped[str] = mapped_column(String(512), nullable=False)
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint(
            "instagram_item_id",
            "media_s3_key",
            name="uq_instagram_item_media_version_item_key",
        ),
    )
