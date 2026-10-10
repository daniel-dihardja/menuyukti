"""POS register (Kasse) stub — one default per location in Phase 1."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from graphql.data_sources.database import Base

if TYPE_CHECKING:
    from graphql.data_sources.models.location import Location
    from graphql.data_sources.models.pos_order import PosOrder


class PosRegister(Base):
    """Cash register / terminal identity scoped to a location."""

    __tablename__ = "pos_register"
    __table_args__ = (
        UniqueConstraint("location_id", "code", name="uq_pos_register_location_code"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    location_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("location.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(64), nullable=False, default="DEFAULT")
    label: Mapped[str] = mapped_column(String(128), nullable=False, default="Register 1")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    location: Mapped[Location] = relationship("Location", back_populates="pos_registers")
    orders: Mapped[list[PosOrder]] = relationship("PosOrder", back_populates="register")
