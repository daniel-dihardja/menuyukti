"""Workspace-scoped media library catalog and collections (photos)."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.workspace import Workspace


class MediaAsset(Base):
    """Catalog row for a workspace photo (S3 key stays flat under photos/)."""

    __tablename__ = "media_asset"
    __table_args__ = (
        UniqueConstraint("workspace_id", "filename", name="uq_media_asset_workspace_filename"),
        Index("ix_media_asset_workspace_id", "workspace_id", unique=False),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("workspace.id", ondelete="CASCADE"),
        nullable=False,
    )
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(256), nullable=True)
    created_by_clerk_user_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    workspace: Mapped[Workspace] = relationship(
        "Workspace",
        back_populates="media_assets",
    )
    memberships: Mapped[list[MediaCollectionMember]] = relationship(
        "MediaCollectionMember",
        back_populates="asset",
        cascade="all, delete-orphan",
    )


class MediaCollection(Base):
    """Named group of media assets within a workspace."""

    __tablename__ = "media_collection"
    __table_args__ = (
        UniqueConstraint("workspace_id", "name", name="uq_media_collection_workspace_name"),
        Index("ix_media_collection_workspace_id", "workspace_id", unique=False),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("workspace.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    created_by_clerk_user_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    workspace: Mapped[Workspace] = relationship(
        "Workspace",
        back_populates="media_collections",
    )
    members: Mapped[list[MediaCollectionMember]] = relationship(
        "MediaCollectionMember",
        back_populates="collection",
        cascade="all, delete-orphan",
    )


class MediaCollectionMember(Base):
    """Many-to-many link between a collection and a media asset."""

    __tablename__ = "media_collection_member"
    __table_args__ = (
        UniqueConstraint(
            "collection_id",
            "asset_id",
            name="uq_media_collection_member_collection_asset",
        ),
        Index("ix_media_collection_member_collection_id", "collection_id", unique=False),
        Index("ix_media_collection_member_asset_id", "asset_id", unique=False),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    collection_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("media_collection.id", ondelete="CASCADE"),
        nullable=False,
    )
    asset_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("media_asset.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    collection: Mapped[MediaCollection] = relationship(
        "MediaCollection",
        back_populates="members",
    )
    asset: Mapped[MediaAsset] = relationship(
        "MediaAsset",
        back_populates="memberships",
    )
