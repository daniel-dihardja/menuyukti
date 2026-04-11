"""Workspace and membership ORM models."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.location import Location


class Workspace(Base):
    """
    Tenant container: multiple locations and members share a workspace.
    """

    __tablename__ = "workspace"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(256))
    owner_clerk_user_id: Mapped[str] = mapped_column(String(128), index=True)
    created_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[object] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    memberships: Mapped[list[WorkspaceMembership]] = relationship(back_populates="workspace")
    locations: Mapped[list[Location]] = relationship(back_populates="workspace")
    api_adapter_tools: Mapped[list["ApiAdapterTool"]] = relationship(back_populates="workspace")


class WorkspaceMembership(Base):
    """
    Links a Clerk user to a workspace with a role (owner or member).
    """

    __tablename__ = "workspace_membership"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workspace_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("workspace.id"),
        index=True,
    )
    clerk_user_id: Mapped[str] = mapped_column(String(128), index=True)
    role: Mapped[str] = mapped_column(String(32))
    invited_at: Mapped[object] = mapped_column(DateTime(timezone=True), server_default=func.now())
    accepted_at: Mapped[object | None] = mapped_column(DateTime(timezone=True), nullable=True)

    workspace: Mapped[Workspace] = relationship(back_populates="memberships")

    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "clerk_user_id",
            name="uq_workspace_membership_workspace_user",
        ),
    )
