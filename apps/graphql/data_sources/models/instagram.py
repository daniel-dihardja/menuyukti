"""Instagram post ORM model."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.location import Location
    from graphql.data_sources.models.workspace import Workspace


class InstagramPost(Base):
    """
    Instagram post draft or published post, scoped to a workspace.

    Holds platform, platform post id, status, media type, caption, and published_at.
    Location is optional for standalone Post Creator drafts.
    """

    __tablename__ = "instagram_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("workspace.id"),
        nullable=True,
        index=True,
    )
    location_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("location.id"),
        nullable=True,
        index=True,
    )
    workspace: Mapped[Workspace | None] = relationship(back_populates="instagram_posts")
    location: Mapped[Location | None] = relationship(back_populates="instagram_posts")
    platform: Mapped[str] = mapped_column(String(32), default="instagram")
    platform_post_id: Mapped[str | None] = mapped_column(String(256), nullable=True)
    status: Mapped[str] = mapped_column(String(64), default="draft")
    media_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    title: Mapped[str | None] = mapped_column(String(256), nullable=True)
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_clerk_user_id: Mapped[str | None] = mapped_column(
        String(128), nullable=True, index=True
    )
    published_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        Index("ix_instagram_post_location_published_at", "location_id", "published_at"),
        Index("ix_instagram_post_platform_post_id", "platform_post_id"),
    )
