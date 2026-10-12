"""Orchestrate fiscal processes for native POS tickets.

Fiscal provider selection (``POS_FISCAL_PROVIDER``):

- unset / ``mock`` — in-process mock TSE (local/test only; refused in production)
- ``off`` / ``none`` / ``disabled`` — skip fiscalization
- ``fiskaly`` — SIGN DE adapter (stub until HTTP client lands)

Related env for the fiskaly path: ``FISKALY_API_KEY``, ``FISKALY_API_SECRET``,
``FISKALY_ENV`` (``test`` | ``live``).
"""

from __future__ import annotations

import os
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from graphql.data_sources.models.pos_fiscal_process import PosFiscalProcess
from graphql.data_sources.models.pos_order import PosOrder
from graphql.services.pos_audit import record_pos_audit
from graphql.services.pos_fiscal_fiskaly import FiskalyTseAdapter
from graphql.services.pos_fiscal_mock import MockTseAdapter
from graphql.services.pos_fiscal_port import FiscalizationPort, FiscalProcessContext

KIND_SALE = "sale"
KIND_REFUND = "refund"
STATE_STARTED = "started"
STATE_FINISHED = "finished"
STATE_CANCELLED = "cancelled"
STATE_FAILED = "failed"

PROVIDER_OFF = "off"
PROVIDER_MOCK = "mock"
PROVIDER_FISKALY = "fiskaly"


def _utcnow() -> datetime:
    return datetime.now(UTC)


def _is_production_runtime() -> bool:
    """Mirror graphql.server.is_production_runtime (avoid importing server from services)."""
    for key in ("GRAPHQL_ENV", "ENV", "VERCEL_ENV", "NODE_ENV"):
        if os.environ.get(key, "").strip().lower() == "production":
            return True
    return False


def fiscal_provider_name() -> str:
    """Resolve allowlisted provider; unknown values raise (no silent mock fallback)."""
    raw = (os.environ.get("POS_FISCAL_PROVIDER") or PROVIDER_MOCK).strip().lower()
    if raw in {"", "mock"}:
        return PROVIDER_MOCK
    if raw in {"off", "none", "disabled"}:
        return PROVIDER_OFF
    if raw == PROVIDER_FISKALY:
        return PROVIDER_FISKALY
    raise ValueError(f"Unknown POS_FISCAL_PROVIDER={raw!r}; allowed: off, mock, fiskaly")


def get_fiscal_port() -> FiscalizationPort | None:
    name = fiscal_provider_name()
    if name == PROVIDER_OFF:
        return None
    if name == PROVIDER_FISKALY:
        return FiskalyTseAdapter()
    if _is_production_runtime():
        raise RuntimeError(
            "POS_FISCAL_PROVIDER=mock is not allowed in production. "
            "Set POS_FISCAL_PROVIDER=fiskaly (or off) before starting."
        )
    return MockTseAdapter()


def assert_finished_fiscal_immutable(process: PosFiscalProcess) -> None:
    """Refuse in-place mutation of a finished fiscal process row."""
    if process.state == STATE_FINISHED:
        raise ValueError(
            f"Cannot mutate finished fiscal process id={process.id} "
            f"(order_id={process.pos_order_id}, kind={process.kind})"
        )


def _ctx_from_order(
    order: PosOrder, *, kind: str, payment_method: str | None = None
) -> FiscalProcessContext:
    return FiscalProcessContext(
        order_id=order.id,
        bill_number=order.bill_number,
        location_id=order.location_id,
        register_id=order.register_id,
        kind=kind,
        gross_cents=int(order.gross_cents or 0),
        net_cents=int(order.net_cents or 0),
        tax_cents=int(order.tax_cents or 0),
        payment_method=payment_method or order.payment_method,
    )


def get_process(
    session: Session,
    *,
    order_id: int,
    kind: str,
) -> PosFiscalProcess | None:
    return session.scalar(
        select(PosFiscalProcess)
        .where(PosFiscalProcess.pos_order_id == order_id, PosFiscalProcess.kind == kind)
        .order_by(PosFiscalProcess.id.desc())
    )


def list_processes_for_order(session: Session, order_id: int) -> list[PosFiscalProcess]:
    return list(
        session.execute(
            select(PosFiscalProcess)
            .where(PosFiscalProcess.pos_order_id == order_id)
            .order_by(PosFiscalProcess.id)
        )
        .scalars()
        .all()
    )


def start_sale_process(
    session: Session,
    order: PosOrder,
    *,
    actor_clerk_user_id: str | None = None,
) -> PosFiscalProcess | None:
    port = get_fiscal_port()
    if port is None:
        return None

    existing = get_process(session, order_id=order.id, kind=KIND_SALE)
    if existing is not None and existing.state in {STATE_STARTED, STATE_FINISHED}:
        return existing

    process = existing or PosFiscalProcess(
        pos_order_id=order.id,
        kind=KIND_SALE,
        state=STATE_STARTED,
        provider=port.name,
    )
    if existing is None:
        session.add(process)

    ctx = _ctx_from_order(order, kind=KIND_SALE)
    try:
        result = port.start(ctx)
    except Exception as exc:  # noqa: BLE001 — provider boundary
        process.state = STATE_FAILED
        process.provider = port.name
        process.last_error = str(exc)
        session.flush()
        if actor_clerk_user_id:
            record_pos_audit(
                session,
                location_id=order.location_id,
                pos_order_id=order.id,
                actor_clerk_user_id=actor_clerk_user_id,
                action="fiscal_fail",
                payload={"kind": KIND_SALE, "phase": "start", "error": str(exc)},
            )
        raise ValueError(f"Fiscalization start failed: {exc}") from exc

    process.state = STATE_STARTED
    process.provider = port.name
    process.tse_transaction_id = result.tse_transaction_id
    process.client_id = result.client_id
    process.certificate_serial = result.certificate_serial
    process.process_type = result.process_type
    process.started_at = result.started_at
    process.last_error = None
    session.flush()
    if actor_clerk_user_id:
        record_pos_audit(
            session,
            location_id=order.location_id,
            pos_order_id=order.id,
            actor_clerk_user_id=actor_clerk_user_id,
            action="fiscal_start",
            payload={
                "kind": KIND_SALE,
                "tse_transaction_id": result.tse_transaction_id,
                "provider": port.name,
            },
        )
    return process


def update_sale_process(
    session: Session,
    order: PosOrder,
    *,
    actor_clerk_user_id: str | None = None,
) -> PosFiscalProcess | None:
    port = get_fiscal_port()
    if port is None:
        return None

    process = get_process(session, order_id=order.id, kind=KIND_SALE)
    if process is None or process.state != STATE_STARTED or not process.tse_transaction_id:
        return process

    ctx = _ctx_from_order(order, kind=KIND_SALE)
    try:
        result = port.update(ctx, tse_transaction_id=process.tse_transaction_id)
    except Exception as exc:  # noqa: BLE001
        process.state = STATE_FAILED
        process.last_error = str(exc)
        session.flush()
        if actor_clerk_user_id:
            record_pos_audit(
                session,
                location_id=order.location_id,
                pos_order_id=order.id,
                actor_clerk_user_id=actor_clerk_user_id,
                action="fiscal_fail",
                payload={"kind": KIND_SALE, "phase": "update", "error": str(exc)},
            )
        # Best-effort: leave ticket open, do not raise (per plan)
        return process

    process.tse_transaction_id = result.tse_transaction_id
    process.last_error = None
    session.flush()
    if actor_clerk_user_id:
        record_pos_audit(
            session,
            location_id=order.location_id,
            pos_order_id=order.id,
            actor_clerk_user_id=actor_clerk_user_id,
            action="fiscal_update",
            payload={"kind": KIND_SALE, "tse_transaction_id": result.tse_transaction_id},
        )
    return process


def finish_sale_process(
    session: Session,
    order: PosOrder,
    *,
    payment_method: str,
    actor_clerk_user_id: str | None = None,
) -> PosFiscalProcess | None:
    port = get_fiscal_port()
    if port is None:
        return None

    process = get_process(session, order_id=order.id, kind=KIND_SALE)
    if process is not None and process.state == STATE_FINISHED:
        return process

    if process is None or not process.tse_transaction_id or process.state == STATE_FAILED:
        # Attempt (re)start then finish
        process = start_sale_process(session, order, actor_clerk_user_id=actor_clerk_user_id)
        if process is None:
            return None

    if process.state != STATE_STARTED or not process.tse_transaction_id:
        raise ValueError(
            f"Cannot finish fiscal process in state={process.state!r} (order_id={order.id})"
        )

    ctx = _ctx_from_order(order, kind=KIND_SALE, payment_method=payment_method)
    try:
        result = port.finish(ctx, tse_transaction_id=process.tse_transaction_id)
    except Exception as exc:  # noqa: BLE001
        process.state = STATE_FAILED
        process.last_error = str(exc)
        session.flush()
        if actor_clerk_user_id:
            record_pos_audit(
                session,
                location_id=order.location_id,
                pos_order_id=order.id,
                actor_clerk_user_id=actor_clerk_user_id,
                action="fiscal_fail",
                payload={"kind": KIND_SALE, "phase": "finish", "error": str(exc)},
            )
        raise ValueError(f"Fiscalization finish failed: {exc}") from exc

    process.state = STATE_FINISHED
    process.tse_transaction_id = result.tse_transaction_id
    process.tse_signature = result.tse_signature
    process.signature_counter = result.signature_counter
    process.certificate_serial = result.certificate_serial
    process.qr_payload = result.qr_payload
    process.finished_at = result.finished_at
    process.last_error = None
    session.flush()
    if actor_clerk_user_id:
        record_pos_audit(
            session,
            location_id=order.location_id,
            pos_order_id=order.id,
            actor_clerk_user_id=actor_clerk_user_id,
            action="fiscal_finish",
            payload={
                "kind": KIND_SALE,
                "tse_transaction_id": result.tse_transaction_id,
                "signature_counter": result.signature_counter,
            },
        )
    return process


def cancel_sale_process(
    session: Session,
    order: PosOrder,
    *,
    actor_clerk_user_id: str | None = None,
) -> PosFiscalProcess | None:
    port = get_fiscal_port()
    if port is None:
        return None

    process = get_process(session, order_id=order.id, kind=KIND_SALE)
    if process is None:
        return None
    if process.state in {STATE_CANCELLED, STATE_FINISHED}:
        return process
    if process.state != STATE_STARTED or not process.tse_transaction_id:
        process.state = STATE_CANCELLED
        process.finished_at = _utcnow()
        session.flush()
        return process

    ctx = _ctx_from_order(order, kind=KIND_SALE)
    try:
        result = port.cancel(ctx, tse_transaction_id=process.tse_transaction_id)
    except Exception as exc:  # noqa: BLE001
        process.state = STATE_FAILED
        process.last_error = str(exc)
        session.flush()
        if actor_clerk_user_id:
            record_pos_audit(
                session,
                location_id=order.location_id,
                pos_order_id=order.id,
                actor_clerk_user_id=actor_clerk_user_id,
                action="fiscal_fail",
                payload={"kind": KIND_SALE, "phase": "cancel", "error": str(exc)},
            )
        raise ValueError(f"Fiscalization cancel failed: {exc}") from exc

    process.state = STATE_CANCELLED
    process.finished_at = result.finished_at
    process.last_error = None
    session.flush()
    if actor_clerk_user_id:
        record_pos_audit(
            session,
            location_id=order.location_id,
            pos_order_id=order.id,
            actor_clerk_user_id=actor_clerk_user_id,
            action="fiscal_cancel",
            payload={"kind": KIND_SALE, "tse_transaction_id": process.tse_transaction_id},
        )
    return process


def start_and_finish_refund_process(
    session: Session,
    order: PosOrder,
    *,
    actor_clerk_user_id: str | None = None,
) -> PosFiscalProcess | None:
    port = get_fiscal_port()
    if port is None:
        return None

    existing = get_process(session, order_id=order.id, kind=KIND_REFUND)
    if existing is not None and existing.state == STATE_FINISHED:
        return existing

    process = existing or PosFiscalProcess(
        pos_order_id=order.id,
        kind=KIND_REFUND,
        state=STATE_STARTED,
        provider=port.name,
    )
    if existing is None:
        session.add(process)

    ctx = _ctx_from_order(order, kind=KIND_REFUND)
    try:
        start = port.start(ctx)
        finish = port.finish(ctx, tse_transaction_id=start.tse_transaction_id)
    except Exception as exc:  # noqa: BLE001
        process.state = STATE_FAILED
        process.provider = port.name
        process.last_error = str(exc)
        session.flush()
        if actor_clerk_user_id:
            record_pos_audit(
                session,
                location_id=order.location_id,
                pos_order_id=order.id,
                actor_clerk_user_id=actor_clerk_user_id,
                action="fiscal_fail",
                payload={"kind": KIND_REFUND, "phase": "refund", "error": str(exc)},
            )
        raise ValueError(f"Fiscalization refund failed: {exc}") from exc

    process.state = STATE_FINISHED
    process.provider = port.name
    process.tse_transaction_id = finish.tse_transaction_id
    process.tse_signature = finish.tse_signature
    process.signature_counter = finish.signature_counter
    process.certificate_serial = finish.certificate_serial
    process.client_id = start.client_id
    process.qr_payload = finish.qr_payload
    process.process_type = start.process_type
    process.started_at = start.started_at
    process.finished_at = finish.finished_at
    process.last_error = None
    session.flush()
    if actor_clerk_user_id:
        record_pos_audit(
            session,
            location_id=order.location_id,
            pos_order_id=order.id,
            actor_clerk_user_id=actor_clerk_user_id,
            action="fiscal_finish",
            payload={
                "kind": KIND_REFUND,
                "tse_transaction_id": finish.tse_transaction_id,
                "signature_counter": finish.signature_counter,
            },
        )
    return process
