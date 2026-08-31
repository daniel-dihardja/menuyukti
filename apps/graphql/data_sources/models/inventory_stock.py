"""Location-scoped stock levels for inventar catalog items."""

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
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.inventory_catalog_item import InventoryCatalogItem
    from graphql.data_sources.models.inventory_stock_movement import InventoryStockMovement
    from graphql.data_sources.models.location import Location


class InventoryStock(Base):
    """Current package count for a catalog item at one location."""

    __tablename__ = "inventory_stock"
    __table_args__ = (
        UniqueConstraint(
            "location_id",
            "catalog_item_id",
            name="uq_inventory_stock_location_catalog",
        ),
        Index("ix_inventory_stock_location_id", "location_id", unique=False),
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
    on_hand: Mapped[float] = mapped_column(Float, nullable=False)
    last_in_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    last_out_on: Mapped[date | None] = mapped_column(Date, nullable=True)
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

    location: Mapped[Location] = relationship(
        "Location",
        back_populates="inventory_stock",
    )
    catalog_item: Mapped[InventoryCatalogItem] = relationship(
        "InventoryCatalogItem",
        back_populates="stock_rows",
    )
    movements: Mapped[list[InventoryStockMovement]] = relationship(
        "InventoryStockMovement",
        back_populates="stock",
        foreign_keys="InventoryStockMovement.stock_id",
    )
