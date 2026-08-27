"""Workspace-scoped pantry catalog items for relaxed inventar."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.inventory_stock import InventoryStock
    from graphql.data_sources.models.workspace import Workspace


class InventoryCatalogItem(Base):
    """Pantry item definition: name, package label, and primary storage zone."""

    __tablename__ = "inventory_catalog_item"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "name",
            "package_size",
            "package_unit",
            name="uq_inventory_catalog_item_workspace_pack",
        ),
        Index("ix_inventory_catalog_item_workspace_id", "workspace_id", unique=False),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("workspace.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    package_size: Mapped[float] = mapped_column(Float, nullable=False)
    package_unit: Mapped[str] = mapped_column(String(32), nullable=False)
    storage_zone: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        server_default="dry",
        default="dry",
    )
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
        back_populates="inventory_catalog_items",
    )
    stock_rows: Mapped[list[InventoryStock]] = relationship(
        "InventoryStock",
        back_populates="catalog_item",
        cascade="all, delete-orphan",
    )
