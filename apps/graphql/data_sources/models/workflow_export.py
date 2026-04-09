"""Persisted JSON snapshot of a workflow root's milestones and child nodes."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.location import Location
    from graphql.data_sources.models.node import Node


class WorkflowExport(Base):
    """
    One row per workflow root: upsert replaces payload when export is run again.
    """

    __tablename__ = "workflow"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workflow_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("node.id"),
        unique=True,
        index=True,
    )
    location_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("location.id"),
        index=True,
    )
    payload: Mapped[dict] = mapped_column(JSONB().with_variant(JSON(), "sqlite"))
    schema_version: Mapped[str] = mapped_column(Text, server_default=text("'2.0'"))
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    workflow_root_node: Mapped[Node] = relationship("Node", foreign_keys=[workflow_id])
    location: Mapped[Location] = relationship("Location", foreign_keys=[location_id])
