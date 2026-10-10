"""Date-effective VAT rate master data (basis points)."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from graphql.data_sources.database import Base


class TaxRate(Base):
    """VAT rate identified by tax class code (e.g. standard, reduced)."""

    __tablename__ = "tax_rate"
    __table_args__ = (UniqueConstraint("code", "valid_from", name="uq_tax_rate_code_valid_from"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    rate_bps: Mapped[int] = mapped_column(Integer, nullable=False)
    valid_from: Mapped[date] = mapped_column(Date, nullable=False)
    valid_to: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
