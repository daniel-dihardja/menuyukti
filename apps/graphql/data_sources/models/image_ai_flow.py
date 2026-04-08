"""Image AI flow ORM model."""

from sqlalchemy import JSON, Boolean, Column, DateTime, Integer, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import true as sql_true

from graphql.data_sources.database import Base


class ImageAiFlow(Base):
    """
    Configurable image post-processing flows (e.g. Leonardo / Nano Banana) for asset uploads.

    Slug is the stable key sent from the web client; display_name is shown in the UI.
    """

    __tablename__ = "image_ai_flow"

    id = Column(Integer, primary_key=True, autoincrement=True)
    slug = Column(Text, unique=True, nullable=False, index=True)
    display_name = Column(Text, nullable=False)
    prompt = Column(Text, nullable=False)
    model = Column(Text, nullable=False)
    prompt_enhance = Column(Text, nullable=True)
    image_reference_strength = Column(Text, nullable=True)
    style_ids = Column(JSONB().with_variant(JSON(), "sqlite"), nullable=True)
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default=sql_true(),
    )
    sort_order = Column(
        Integer,
        nullable=False,
        default=0,
        server_default=text("0"),
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
