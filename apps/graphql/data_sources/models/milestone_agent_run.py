"""Persisted record for one milestone agent run (correlates with SSE ``run_id`` and LangSmith)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.location import Location
    from graphql.data_sources.models.node import Node


class MilestoneAgentRun(Base):
    """One row per user-triggered milestone run from the agents service."""

    __tablename__ = "milestone_agent_run"

    run_id: Mapped[str] = mapped_column(Text, primary_key=True)
    milestone_node_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("node.id"),
        nullable=False,
        index=True,
    )
    workflow_root_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("node.id"),
        nullable=True,
    )
    location_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("location.id"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    started_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    finished_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        server_default=text("'running'"),
    )
    external_trace_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    external_trace_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary: Mapped[dict | list | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=True,
    )
    timeline: Mapped[dict | list | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=True,
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    milestone_node: Mapped[Node] = relationship("Node", foreign_keys=[milestone_node_id])
    workflow_root_node: Mapped[Node | None] = relationship(
        "Node",
        foreign_keys=[workflow_root_id],
    )
    location: Mapped[Location] = relationship("Location", foreign_keys=[location_id])
