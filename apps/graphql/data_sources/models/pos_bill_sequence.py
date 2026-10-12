"""Per-location daily bill-number sequence (locked on allocate)."""

from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from graphql.data_sources.database import Base


class PosBillSequence(Base):
    """Tracks next bill suffix for ``MY-YYYYMMDD-#####`` per location/day."""

    __tablename__ = "pos_bill_sequence"
    __table_args__ = (
        UniqueConstraint("location_id", "day_key", name="uq_pos_bill_sequence_location_day"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    location_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("location.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    day_key: Mapped[str] = mapped_column(String(8), nullable=False)
    next_seq: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
