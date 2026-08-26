"""Workspace and membership ORM models."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.crm_app import CrmApp
    from graphql.data_sources.models.instagram import InstagramPost
    from graphql.data_sources.models.inventory_catalog_item import InventoryCatalogItem
    from graphql.data_sources.models.location import Location
    from graphql.data_sources.models.media_asset import MediaAsset, MediaCollection
    from graphql.data_sources.models.visual_style import VisualStyle


class Workspace(Base):
    """
    Tenant container: multiple locations and members share a workspace.
    """

    __tablename__ = "workspace"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(256))
    owner_clerk_user_id: Mapped[str] = mapped_column(String(128), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    memberships: Mapped[list[WorkspaceMembership]] = relationship(back_populates="workspace")
    locations: Mapped[list[Location]] = relationship(back_populates="workspace")
    instagram_posts: Mapped[list[InstagramPost]] = relationship(back_populates="workspace")
    visual_styles: Mapped[list[VisualStyle]] = relationship(
        back_populates="workspace",
        cascade="all, delete-orphan",
        order_by="VisualStyle.name",
    )
    media_assets: Mapped[list[MediaAsset]] = relationship(
        back_populates="workspace",
        cascade="all, delete-orphan",
        order_by="MediaAsset.filename",
    )
    media_collections: Mapped[list[MediaCollection]] = relationship(
        back_populates="workspace",
        cascade="all, delete-orphan",
        order_by="MediaCollection.name",
    )
    crm_apps: Mapped[list[CrmApp]] = relationship(
        back_populates="workspace",
        cascade="all, delete-orphan",
        order_by="CrmApp.title",
    )
    inventory_catalog_items: Mapped[list[InventoryCatalogItem]] = relationship(
        back_populates="workspace",
        cascade="all, delete-orphan",
        order_by="InventoryCatalogItem.name",
    )


class WorkspaceMembership(Base):
    """
    Links a Clerk user to a workspace with a role (owner or member).
    """

    __tablename__ = "workspace_membership"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("workspace.id"),
        index=True,
    )
    clerk_user_id: Mapped[str] = mapped_column(String(128), index=True)
    role: Mapped[str] = mapped_column(String(32))
    invited_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    workspace: Mapped[Workspace] = relationship(back_populates="memberships")

    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "clerk_user_id",
            name="uq_workspace_membership_workspace_user",
        ),
    )
