"""Location ORM model."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.calendar_entry import CalendarEntry
    from graphql.data_sources.models.instagram import InstagramPost
    from graphql.data_sources.models.location_manual_brief_input import LocationManualBriefInput
    from graphql.data_sources.models.location_menu_item_cogs import LocationMenuItemCogs
    from graphql.data_sources.models.location_opening_hour import LocationOpeningHour
    from graphql.data_sources.models.node import Node
    from graphql.data_sources.models.workspace import Workspace


class Location(Base):
    """
    Restaurant / location dimension for analytics runs.
    """

    __tablename__ = "location"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(256))
    street: Mapped[str | None] = mapped_column(String(512), nullable=True)
    city: Mapped[str | None] = mapped_column(String(128), nullable=True)
    country: Mapped[str | None] = mapped_column(String(128), nullable=True)
    currency: Mapped[str | None] = mapped_column(String(16), nullable=True)
    workspace_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("workspace.id"),
        nullable=True,
        index=True,
    )
    clerk_user_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    node_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("node.id", use_alter=True, name="fk_location_node_id"),
        nullable=True,
        index=True,
    )

    workspace: Mapped[Workspace | None] = relationship(back_populates="locations")
    instagram_posts: Mapped[list[InstagramPost]] = relationship(
        back_populates="location",
        foreign_keys="InstagramPost.location_id",
    )
    nodes: Mapped[list[Node]] = relationship(
        "Node",
        back_populates="location",
        foreign_keys="Node.location_id",
    )
    location_root_node: Mapped[Node | None] = relationship(
        "Node",
        foreign_keys="Location.node_id",
        post_update=True,
    )
    manual_brief_input: Mapped[LocationManualBriefInput | None] = relationship(
        "LocationManualBriefInput",
        back_populates="location",
        uselist=False,
    )
    opening_hours: Mapped[list[LocationOpeningHour]] = relationship(
        "LocationOpeningHour",
        back_populates="location",
        cascade="all, delete-orphan",
        order_by="LocationOpeningHour.day_of_week",
    )
    menu_item_cogs: Mapped[list[LocationMenuItemCogs]] = relationship(
        "LocationMenuItemCogs",
        back_populates="location",
        cascade="all, delete-orphan",
        order_by="LocationMenuItemCogs.menu",
    )
    calendar_entries: Mapped[list[CalendarEntry]] = relationship(
        "CalendarEntry",
        back_populates="location",
        cascade="all, delete-orphan",
        order_by="CalendarEntry.entry_date",
    )
