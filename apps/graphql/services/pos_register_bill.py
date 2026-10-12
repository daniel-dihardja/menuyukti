"""POS default register bootstrap and bill number sequences."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from graphql.data_sources.models.pos_bill_sequence import PosBillSequence
from graphql.data_sources.models.pos_register import PosRegister
from graphql.services.pos_order_constants import DEFAULT_REGISTER_CODE, DEFAULT_REGISTER_LABEL


def ensure_default_register(session: Session, location_id: int) -> PosRegister:
    existing = session.scalar(
        select(PosRegister).where(
            PosRegister.location_id == location_id,
            PosRegister.code == DEFAULT_REGISTER_CODE,
        )
    )
    if existing is not None:
        return existing
    register = PosRegister(
        location_id=location_id,
        code=DEFAULT_REGISTER_CODE,
        label=DEFAULT_REGISTER_LABEL,
    )
    session.add(register)
    session.flush()
    return register


def next_bill_number(session: Session, location_id: int, when: datetime) -> str:
    """Return ``MY-YYYYMMDD-#####`` unique for the location on that calendar day."""
    day = when.astimezone(UTC).date() if when.tzinfo else when.date()
    day_key = day.strftime("%Y%m%d")
    prefix = f"MY-{day_key}-"

    seq = session.scalar(
        select(PosBillSequence)
        .where(
            PosBillSequence.location_id == location_id,
            PosBillSequence.day_key == day_key,
        )
        .with_for_update()
    )
    if seq is None:
        seq = PosBillSequence(location_id=location_id, day_key=day_key, next_seq=1)
        session.add(seq)
        session.flush()
        # Re-lock after insert for engines that need it
        seq = session.scalar(
            select(PosBillSequence).where(PosBillSequence.id == seq.id).with_for_update()
        )
        assert seq is not None

    number = seq.next_seq
    seq.next_seq = number + 1
    session.flush()
    return f"{prefix}{number:05d}"
