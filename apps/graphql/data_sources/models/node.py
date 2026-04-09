"""Node hierarchy ORM model."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, Index, Integer, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.location import Location


class Node(Base):
    """
    Graph-like hierarchy: each row is a vertex with an optional parent edge (adjacency list).
    """

    __tablename__ = "node"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    parent_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("node.id"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    path: Mapped[str] = mapped_column(Text)
    node_type: Mapped[str] = mapped_column(
        "type",
        Text,
        default="unknown",
        server_default=text("'unknown'"),
    )
    location_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("location.id"),
        nullable=True,
        index=True,
    )
    data: Mapped[dict | list | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"), nullable=True
    )
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    parent: Mapped[Node | None] = relationship(
        "Node",
        remote_side="Node.id",
        back_populates="children",
    )
    children: Mapped[list[Node]] = relationship("Node", back_populates="parent")
    location: Mapped[Location | None] = relationship(
        "Location",
        back_populates="nodes",
        foreign_keys="Node.location_id",
    )

    __table_args__ = (Index("ix_node_location_type", "location_id", "type"),)
