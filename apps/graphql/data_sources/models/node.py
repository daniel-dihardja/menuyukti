"""Node hierarchy ORM model."""

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Index, Integer, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from graphql.data_sources.database import Base


class Node(Base):
    """
    Graph-like hierarchy: each row is a vertex with an optional parent edge (adjacency list).
    """

    __tablename__ = "node"

    id = Column(Integer, primary_key=True, autoincrement=True)
    parent_id = Column(
        Integer,
        ForeignKey("node.id"),
        nullable=True,
        index=True,
    )
    name = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    path = Column(Text, nullable=False)
    node_type = Column(
        "type",
        Text,
        nullable=False,
        default="unknown",
        server_default=text("'unknown'"),
    )
    location_id = Column(
        Integer,
        ForeignKey("location.id"),
        nullable=True,
        index=True,
    )
    data = Column(JSONB().with_variant(JSON(), "sqlite"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    parent = relationship("Node", remote_side=[id], back_populates="children")
    children = relationship("Node", back_populates="parent")
    location = relationship(
        "Location",
        back_populates="nodes",
        foreign_keys=[location_id],
    )

    __table_args__ = (Index("ix_node_location_type", "location_id", "type"),)
