"""Instagram post ORM model."""

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text, func
from sqlalchemy.orm import relationship

from graphql.data_sources.database import Base


class InstagramPost(Base):
    """
    Instagram post (content plan / published post) scoped to a location.

    Holds platform, platform post id, status, media type, caption, and published_at.
    """

    __tablename__ = "instagram_posts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    location_id = Column(
        Integer,
        ForeignKey("location.id"),
        nullable=False,
        index=True,
    )
    location = relationship("Location", back_populates="instagram_posts")
    platform = Column(String(32), nullable=False, default="instagram")
    platform_post_id = Column(String(256), nullable=True, index=True)
    status = Column(String(64), nullable=False, default="draft")
    media_type = Column(String(64), nullable=True)
    caption = Column(Text, nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        Index("ix_instagram_post_location_published_at", "location_id", "published_at"),
        Index("ix_instagram_post_platform_post_id", "platform_post_id"),
    )
