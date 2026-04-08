"""Workspace and membership ORM models."""

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import relationship

from graphql.data_sources.database import Base


class Workspace(Base):
    """
    Tenant container: multiple locations and members share a workspace.
    """

    __tablename__ = "workspace"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(256), nullable=False)
    owner_clerk_user_id = Column(String(128), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    memberships = relationship("WorkspaceMembership", back_populates="workspace")
    locations = relationship("Location", back_populates="workspace")


class WorkspaceMembership(Base):
    """
    Links a Clerk user to a workspace with a role (owner or member).
    """

    __tablename__ = "workspace_membership"

    id = Column(Integer, primary_key=True, autoincrement=True)
    workspace_id = Column(
        Integer,
        ForeignKey("workspace.id"),
        nullable=False,
        index=True,
    )
    clerk_user_id = Column(String(128), nullable=False, index=True)
    role = Column(String(32), nullable=False)
    invited_at = Column(DateTime(timezone=True), server_default=func.now())
    accepted_at = Column(DateTime(timezone=True), nullable=True)

    workspace = relationship("Workspace", back_populates="memberships")

    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "clerk_user_id",
            name="uq_workspace_membership_workspace_user",
        ),
    )
