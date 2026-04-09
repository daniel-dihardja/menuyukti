"""Persisted JSON snapshot of a workflow root's milestones and child nodes."""

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from graphql.data_sources.database import Base


class WorkflowExport(Base):
    """
    One row per workflow root: upsert replaces payload when export is run again.
    """

    __tablename__ = "workflow"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workflow_id = Column(
        Integer,
        ForeignKey("node.id"),
        nullable=False,
        unique=True,
        index=True,
    )
    location_id = Column(
        Integer,
        ForeignKey("location.id"),
        nullable=False,
        index=True,
    )
    payload = Column(JSONB().with_variant(JSON(), "sqlite"), nullable=False)
    schema_version = Column(Text, nullable=False, server_default=text("'2.0'"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    workflow_root_node = relationship("Node", foreign_keys=[workflow_id])
    location = relationship("Location", foreign_keys=[location_id])
