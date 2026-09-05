"""Append-only ledger of inventar stock in/out movements."""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.inventory_catalog_item import InventoryCatalogItem
    from graphql.data_sources.models.inventory_stock import InventoryStock
    from graphql.data_sources.models.location import Location


class InventoryStockMovement(Base):
    """One receive, use, or transfer leg for a catalog item at a location."""

    __tablename__ = "inventory_stock_movement"
    __table_args__ = (
        Index(
            "ix_inventory_stock_movement_loc_catalog_occurred",
            "location_id",
            "catalog_item_id",
            "occurred_on",
        ),
        Index("ix_inventory_stock_movement_stock_id", "stock_id", unique=False),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    location_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("location.id", ondelete="CASCADE"),
        nullable=False,
    )
    catalog_item_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("inventory_catalog_item.id", ondelete="CASCADE"),
        nullable=False,
    )
    stock_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("inventory_stock.id", ondelete="SET NULL"),
        nullable=True,
    )
    direction: Mapped[str] = mapped_column(String(32), nullable=False)
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    occurred_on: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[str | None] = mapped_column(String(512), nullable=True)
    related_movement_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("inventory_stock_movement.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by_clerk_user_id: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    location: Mapped[Location] = relationship("Location")
    catalog_item: Mapped[InventoryCatalogItem] = relationship("InventoryCatalogItem")
    stock: Mapped[InventoryStock | None] = relationship(
        "InventoryStock",
        back_populates="movements",
    )
    related_movement: Mapped[InventoryStockMovement | None] = relationship(
        "InventoryStockMovement",
        remote_side="InventoryStockMovement.id",
        foreign_keys=[related_movement_id],
    )
