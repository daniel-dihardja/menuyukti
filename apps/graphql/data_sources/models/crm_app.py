"""CRM app ORM model — workspace-scoped loyalty / registration tenant."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.crm_customer import CrmCustomer
    from graphql.data_sources.models.crm_enrollment_token import CrmEnrollmentToken
    from graphql.data_sources.models.workspace import Workspace


class CrmApp(Base):
    """
    Loyalty / customer-registration app owned by a workspace.

    Customers and enrollment tokens hang off this entity, not Location.
    ``app_id`` is the public UUID used in QR / deep links / mobile JWT claims.
    """

    __tablename__ = "crm_app"
    __table_args__ = (
        Index("ix_crm_app_workspace_id", "workspace_id", unique=False),
        Index("uq_crm_app_app_id", "app_id", unique=True),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    app_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        nullable=False,
        default=uuid.uuid4,
    )
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    workspace_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("workspace.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_by_clerk_user_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
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
        back_populates="crm_apps",
    )
    customers: Mapped[list[CrmCustomer]] = relationship(
        "CrmCustomer",
        back_populates="crm_app",
        cascade="all, delete-orphan",
    )
    enrollment_tokens: Mapped[list[CrmEnrollmentToken]] = relationship(
        "CrmEnrollmentToken",
        back_populates="crm_app",
        cascade="all, delete-orphan",
    )
