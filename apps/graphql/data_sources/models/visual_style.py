"""Workspace-scoped visual style packs for Instagram post generation."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.workspace import Workspace


class VisualStyle(Base):
    """Named style pack (rules + reference image) owned by a workspace."""

    __tablename__ = "visual_style"
    __table_args__ = (Index("ix_visual_style_workspace_id", "workspace_id", unique=False),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("workspace.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_by_clerk_user_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    rules: Mapped[str] = mapped_column(Text, nullable=False)
    reference_image_name: Mapped[str] = mapped_column(String(512), nullable=False)
    style_spec: Mapped[dict | None] = mapped_column(
        JSONB().with_variant(JSON(), "sqlite"),
        nullable=True,
    )
    is_default: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    created_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    workspace: Mapped[Workspace] = relationship(
        "Workspace",
        back_populates="visual_styles",
    )
