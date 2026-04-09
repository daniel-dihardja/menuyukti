"""Persisted JSON snapshot of a campaign's milestones and child nodes."""

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from graphql.data_sources.database import Base


class CampaignExport(Base):
    """
    One row per campaign: upsert replaces payload when export is run again.
    """

    __tablename__ = "campaign_export"

    id = Column(Integer, primary_key=True, autoincrement=True)
    campaign_id = Column(
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
    schema_version = Column(Text, nullable=False, server_default=text("'1.0'"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    campaign_node = relationship("Node", foreign_keys=[campaign_id])
    location = relationship("Location", foreign_keys=[location_id])
