"""Location-scoped curated guest menu (one menu per location)."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.location import Location


class Menu(Base):
    """Curated menu catalog for a single location."""

    __tablename__ = "menu"
    __table_args__ = (UniqueConstraint("location_id", name="uq_menu_location_id"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    location_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("location.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(
        String(256),
        nullable=False,
        default="",
        server_default="",
    )
    public_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    header_image_filename: Mapped[str | None] = mapped_column(String(512), nullable=True)
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

    location: Mapped[Location] = relationship("Location", back_populates="menu")
    categories: Mapped[list[MenuCategory]] = relationship(
        "MenuCategory",
        back_populates="menu",
        cascade="all, delete-orphan",
        order_by="MenuCategory.sort_order, MenuCategory.id",
    )
    items: Mapped[list[MenuItem]] = relationship(
        "MenuItem",
        back_populates="menu",
        cascade="save-update, merge",
        passive_deletes=True,
        order_by="MenuItem.sort_order, MenuItem.id",
    )


class MenuCategory(Base):
    """Named section on a location menu (e.g. Food, Drink)."""

    __tablename__ = "menu_category"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    menu_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("menu.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
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

    menu: Mapped[Menu] = relationship("Menu", back_populates="categories")
    items: Mapped[list[MenuItem]] = relationship(
        "MenuItem",
        back_populates="category",
        cascade="all, delete-orphan",
        order_by="MenuItem.sort_order, MenuItem.id",
    )


class MenuItem(Base):
    """One dish line on a location menu."""

    __tablename__ = "menu_item"
    __table_args__ = ()

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    menu_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("menu.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    category_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("menu_category.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
        server_default="",
    )
    price: Mapped[float] = mapped_column(Float, nullable=False)
    sort_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    is_available: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )
    image_filename: Mapped[str | None] = mapped_column(String(512), nullable=True)
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

    menu: Mapped[Menu] = relationship("Menu", back_populates="items")
    category: Mapped[MenuCategory] = relationship("MenuCategory", back_populates="items")
    modifier_groups: Mapped[list[MenuModifierGroup]] = relationship(
        "MenuModifierGroup",
        back_populates="menu_item",
        cascade="all, delete-orphan",
        order_by="MenuModifierGroup.sort_order, MenuModifierGroup.id",
    )


class MenuModifierGroup(Base):
    """Named choice group on a menu item (e.g. Size, Milk)."""

    __tablename__ = "menu_modifier_group"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    menu_item_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("menu_item.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    min_select: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    max_select: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
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

    menu_item: Mapped[MenuItem] = relationship("MenuItem", back_populates="modifier_groups")
    options: Mapped[list[MenuModifierOption]] = relationship(
        "MenuModifierOption",
        back_populates="group",
        cascade="all, delete-orphan",
        order_by="MenuModifierOption.sort_order, MenuModifierOption.id",
    )


class MenuModifierOption(Base):
    """One selectable option inside a modifier group."""

    __tablename__ = "menu_modifier_option"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    group_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("menu_modifier_group.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    price_delta: Mapped[float] = mapped_column(Float, nullable=False, default=0.0, server_default="0")
    is_available: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
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

    group: Mapped[MenuModifierGroup] = relationship("MenuModifierGroup", back_populates="options")
